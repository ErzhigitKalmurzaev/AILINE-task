export class BinaryDecoder {
  decode(data) {
    try {
      if (data instanceof ArrayBuffer) {
        const str = new TextDecoder().decode(new Uint8Array(data));
        return JSON.parse(str);
      }
      if (ArrayBuffer.isView && ArrayBuffer.isView(data)) {
        const str = new TextDecoder().decode(new Uint8Array(data.buffer));
        return JSON.parse(str);
      }
      if (typeof data === 'string') {
        return JSON.parse(data);
      }
      return data;
    } catch (err) {
      return data;
    }
  }
}

export default BinaryDecoder;
