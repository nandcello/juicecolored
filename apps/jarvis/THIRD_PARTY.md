# Protocol provenance

The Xiaomi protocol module and Yeelight command builder originated in the user's Glow dashboard at `/Users/ninom/dev/shenanigans/yeelight-dashboard`. They are isolated under `convex/adapters/vendor` and wrapped by typed Jarvis adapter code.

The independent Xiaomi Home client was checked against the request format documented by [Xiaomi-cloud-tokens-extractor](https://github.com/PiotrMachowski/Xiaomi-cloud-tokens-extractor) and [micloud](https://github.com/Squachen/micloud). It uses Xiaomi-hosted sign-in and API endpoints. This community protocol can change or expire sessions; it is not a Xiaomi-certified integration. No Home Assistant OAuth credentials are included.

Light commands follow the [Yeelight Inter-Operation Specification](https://www.yeelight.com/download/Yeelight_Inter-Operation_Spec.pdf).

Implementation guidance: [StyleX Next.js setup](https://stylexjs.com/docs/learn/installation/nextjs), [Next.js Cache Components](https://nextjs.org/docs/app/getting-started/cache-components), [TypeScript 7 tool compatibility](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/#running-side-by-side-with-typescript-6.0), [Convex with Vercel](https://docs.convex.dev/production/hosting/vercel).

Standing Fan 2 property IDs and ranges follow the [dmaker-p18:1 MIoT specification](https://miot-spec.org/miot-spec-v2/instance?type=urn:miot-spec-v2:device:fan:0000A005:dmaker-p18:1). Speed uses service 2/property 10 (1–100), independently of the four preset fan levels on property 2. Reads and writes use Xiaomi cloud MIoT property endpoints.
