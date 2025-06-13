interface VAddressData {
	host: string;
	port: number;
	/** vless address type */
	type: number;
	raw: Buffer<ArrayBuffer>;
	/** socks address type */
	stype?: number;
}

interface VProtocolData {
	address: VAddressData;
	version: number;
	raw_data_offset: number;
	is_udp: boolean;
}

export function IPv6ToString(buffer: Buffer<ArrayBuffer>): string {
	let str = '';

	for (let i = 0; i < 16; i++) {
		str += buffer[i].toString(16).padStart(2, '0');

		if (i % 2 !== 0 && i !== 15) {
			str += ':';
		}
	}

	return str;
}

export function ParseProtocolData(buffer: Buffer<ArrayBuffer>, user: Buffer<ArrayBuffer>): VProtocolData {
	if (buffer.byteLength < 24) {
		throw new Error('invalid protocol data');
	}

	const version = buffer.readUint8(0);
	const identifier = buffer.subarray(1, 17);

	if (!identifier.equals(user)) {
		throw new Error("protocol identifier didn't match");
	}

	const opt_len = buffer.readUint8(17);
	const command_offset = 18 + opt_len;
	const command = buffer.readUint8(command_offset);

	if (command !== 1 && command !== 2) {
		throw new Error('invalid protocol command');
	}

	const port = buffer.readUInt16BE(command_offset + 1);
	const addrtype = buffer.readUInt8(command_offset + 3);
	const address = { port, type: addrtype } as VAddressData;

	let address_offset = command_offset + 4,
		address_len = 4;

	switch (addrtype) {
		case 1: {
			// IPv4
			address.raw = buffer.subarray(address_offset, address_offset + address_len);
			address.host = address.raw.join('.');
			address.stype = 1;
			break;
		}
		case 2: // Domain
			address_len = buffer.readUInt8(address_offset);
			address.raw = buffer.subarray(address_offset, address_offset + address_len + 1);
			address.host = address.raw.subarray(1).toString();
			address.stype = 3;
			break;
		case 3: // IPv6
			address_len = 16;
			address.raw = buffer.subarray(address_offset, address_offset + address_len);
			address.host = IPv6ToString(address.raw);
			address.stype = 4;
			break;
		default:
			throw new Error('invalid protocol address type');
	}

	return {
		address,
		version,
		raw_data_offset: address_offset + address.raw.byteLength,
		is_udp: command === 2,
	};
}
