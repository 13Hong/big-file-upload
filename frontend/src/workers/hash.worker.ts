import SparkMD5 from "spark-md5";

self.onmessage = async (e: MessageEvent) => {
  const { file, chunkSize } = e.data;
  const blobSlice =
    File.prototype.slice ||
    (File.prototype as any).mozSlice ||
    (File.prototype as any).webkitSlice;
  const chunks = Math.ceil(file.size / chunkSize);
  let currentChunk = 0;
  const spark = new SparkMD5.ArrayBuffer();
  const fileReader = new FileReader();

  fileReader.onload = (e) => {
    spark.append(e.target?.result as ArrayBuffer);
    currentChunk++;

    if (currentChunk < chunks) {
      loadNext();
    } else {
      const hash = spark.end();
      self.postMessage({ hash });
    }
  };

  fileReader.onerror = () => {
    self.postMessage({ error: "read file error" });
  };

  function loadNext() {
    const start = currentChunk * chunkSize;
    const end = start + chunkSize >= file.size ? file.size : start + chunkSize;
    fileReader.readAsArrayBuffer(blobSlice.call(file, start, end));
  }

  loadNext();
};

