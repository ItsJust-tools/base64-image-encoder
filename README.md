# Base64 Image Encoder

Encode image files to Base64 data URIs and decode Base64 back to images entirely in the browser.

**Live:** [base64-image-encoder.itsjust.tools](https://base64-image-encoder.itsjust.tools)

## Features

- Drag-and-drop or file-picker upload of any image with instant size display
- Instant conversion to a data URI (`data:image/png;base64,...`) with MIME type detection and magic-byte sniffing
- Copy the full data URI, raw Base64, CSS or HTML snippet to the clipboard
- Output modes: data URI, raw Base64, CSS (`background-image: url(...)`) and HTML (`img src`)
- Size comparison between the original binary and the Base64 payload with percentage overhead
- Decode mode: paste Base64 or a data URI and preview the resulting image with dimensions
- Image dimension display (width x height) and Base64 size estimate
- Shareable state via URL, `.itsjust.json` import/export and image/PDF export
- 100% client-side — no data ever leaves your browser

## Keyboard shortcuts

| Key | Action           |
| --- | ---------------- |
| `E` | Switch to encode |
| `D` | Switch to decode |
| `C` | Copy output      |

## Development

```bash
npm install
npm run build -w @itsjust/core   # build shared core first
npm run dev
npm test
```

## Deployment

```bash
docker build -t itsjust-base64-image-encoder .
docker run -p 3000:3000 itsjust-base64-image-encoder
```

## License

MIT
