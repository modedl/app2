# RTunnel

make your cloudflare workers as tunnel for VLESS Protocol

# Deploy

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/rafinetiz/rtunnel)

# Environment Variables

| Name          | Required | Description                                                        |
| ------------- | -------- | ------------------------------------------------------------------ |
| `USER`        | **Yes**  | User identification. currently only single user allowed            |
| `SOCKS_RELAY` | **No**   | Relay all request to SOCKS5. default: false                        |
| `SOCKS_HOST`  | **Yes**  | Required if `SOCKS_RELAY` is true. the SOCKS5 server to connect to |
| `SOCKS_PORT`  | **Yes**  | Required if `SOCKS_RELAY` is true. the SOCKS5 port                 |
| `SOCKS_USER`  | **No**   | User used for SOCKS5 authentication                                |
| `SOCKS_PASS`  | **No**   | Password used for SOCKS5 authentication                            |

# Known issues

1. workers can't connect to ip owned by Cloudflare as stated [here](https://developers.cloudflare.com/workers/runtime-apis/tcp-sockets/#_top)
