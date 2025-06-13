import { EventEmitter } from 'node:events';
import { createConnection } from 'node:net';
import type { Socket } from 'node:net';

interface SocksInitOpts {
	host: string;
	port: number;
	user?: string;
	pass?: string;
}

export default class Socks5 extends EventEmitter {
	private _socket: Socket;
	private static GREETING_MESSAGE = new Uint8Array([0x05, 0x02, 0x00, 0x02]); // no auth and user pass auth

	constructor(options: SocksInitOpts) {
		super();

		this._socket = this.initSocket(options);
	}

	get socket(): Socket {
		return this._socket;
	}

	private initSocket(options: SocksInitOpts): Socket {
		const socket = createConnection({
			host: options.host,
			port: options.port,
		});

		const connect_timeout = setTimeout(() => {
			socket.destroy(new Error('socks connection failed. timeout exceeded'));
		}, 10_000);

		socket.on('connect', () => {
			clearTimeout(connect_timeout);
			this.handleSocksHandshake(options);
			this.emit('connect');
		});
		socket.on('error', (err) => this.emit('error', err));
		socket.on('close', (hadError) => this.emit('close', hadError));

		return socket;
	}

	private handleSocksHandshake(options: SocksInitOpts) {
		this._socket.once('data', (chunk) => {
			if (chunk[0] !== 0x05) {
				return this._socket.destroy(new Error(`unexpected socks version from server (${chunk[0]})`));
			}

			switch (chunk[1]) {
				case 0x00:
					return this.emit('ready');
				case 0x02:
					return this.handleAuth(options.user, options.pass);
				case 0xff:
					return this._socket.destroy(new Error("socks server didn't accept offered auth method"));
				default:
					return this._socket.destroy(new Error(`not implemented. (0x${chunk[1].toString(16)})`));
			}
		});

		this._socket.write(Socks5.GREETING_MESSAGE);
	}

	private handleAuth(user?: string, pass?: string) {
		if (!user || !pass) {
			return this._socket.destroy(new Error(`user and password not defined.`));
		}

		this._socket.once('data', (chunk) => {
			if (chunk[0] !== 0x01) {
				return this._socket.destroy(new Error(`unexpected auth response from server (${chunk[0]})`));
			}

			if (chunk[1] === 0x00) {
				return this.emit('ready');
			} else {
				return this._socket.destroy(new Error(`socks authencation failed. (${chunk[1].toString(16)})`));
			}
		});

		// |---------|-------------|-----------------|-------------|-----------------|
		// | VER (1) | USERLEN (1) | USER (variable) | PASSLEN (1) | PASS (variable) |
		// |---------|-------------|-----------------|-------------------------------|
		const auth_message = Buffer.alloc(3 + user.length + pass.length);
		auth_message.writeUint8(0x01, 0);
		auth_message.writeUint8(user.length, 1);
		auth_message.write(user, 2);
		let offset = auth_message.writeUint8(pass.length, 2 + user.length);
		auth_message.write(pass, offset);

		this._socket.write(auth_message);
	}

	public async OpenConnection(host: Buffer<ArrayBuffer>, port: number, type: number, callback?: () => void): Promise<Socket> {
		return new Promise((resolve, reject) => {
			this.once('ready', () => {
				this._socket.once('data', (chunk) => {
					if (chunk[1] !== 0x00) {
						return this._socket.destroy(new Error(`socks request failed. ${chunk[0].toString(16)}`));
					}

					typeof callback === 'function' && callback();

					resolve(this._socket);
				});

				this._socket.once('error', reject);

				// |---------|---------|---------|-----------|--------------------|-------------|
				// | VER (1) | CMD (1) | RSV (1) | ATYPE (1) | ADDRESS (variable) | DSTPORT (2) |
				// |---------|---------|---------|-----------|--------------------|-------------|
				const message = Buffer.alloc(6 + host.byteLength);
				message.writeUint8(0x05, 0);
				message.writeUint8(0x01, 1);
				message.writeUint8(0x00, 2);
				message.writeUint8(type, 3);
				host.copy(message, 4);
				message.writeUint16BE(port, 4 + host.byteLength);

				this._socket.write(message);
			});
		});
	}
}
