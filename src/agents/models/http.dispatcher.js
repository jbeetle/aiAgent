import {Agent, Pool} from 'undici';

/*
| 参数                      | 类型           | 默认值    | 说明                                                                   |
| ----------------------- | ------------ | ------ | -------------------------------------------------------------------- |
| **pipelining**          | `number`     | 1      | 单连接上最多未完成的流水线请求数。HTTP/1.1 下>1 可提升吞吐，但部分 API 对顺序敏感，需验证；HTTP/2 时该字段无效。 |
| **keepAliveTimeout**    | `number(ms)` | 4 000  | 连接空闲多久后主动关闭；调大（30 000）可减少握手开销，但会占用文件描述符。                             |
| **maxKeepAliveTimeout** | `number(ms)` | 30 000 | 服务端返回的 `Keep-Alive: timeout=N` 若大于此值，则以此值为上限，避免服务端承诺时间过长。            |
| **connectTimeout**      | `number(ms)` | 10 000 | TCP（+TLS）建连超时；内网可降到 2 000，跨洲网络建议≥10 000。                             |
| **headersTimeout**      | `number(ms)` | 30 000 | 从建立连接开始，到完整收到响应头超时。大文件上传场景可适当放宽。                                     |
| **bodyTimeout**         | `number(ms)` | 30 000 | 收到响应头后，两包体数据之间最大静默时间。                                                |
| **maxRedirections**     | `number`     | 0      | 自动跟随 3xx 跳转次数；0=不跳转。                                                 |
| **allowH2**             | `boolean`    | false  | 开启 HTTP/2 协商，开启后 `pipelining` 不再起作用。需要 Node ≥16。                     |
| **maxHeaderSize**       | `number(B)`  | 16 384 | 允许的最大响应头大小，调大可避免 “HPE\_HEADER\_OVERFLOW” 错误。                         |

 */

export function createHttpDispatcher(options = {}) {
    const opts = {
        connections: 5,
        allowH2: true,
        keepAliveTimeout: 1000 * 30,
        ...options
    };
    return new Agent({
        factory(origin, opts) {
            return new Pool(origin, opts);
        }
    });
}