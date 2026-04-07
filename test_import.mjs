import { readFileSync } from 'fs';

const filePath = './test_prospects.csv';
const fileContent = readFileSync(filePath);

const boundary = '----FormBoundary' + Math.random().toString(36).substring(2);
const body = [
  `--${boundary}`,
  `Content-Disposition: form-data; name="file"; filename="test_prospects.csv"`,
  `Content-Type: text/csv`,
  '',
  fileContent.toString(),
  `--${boundary}--`
].join('\r\n');

const res = await fetch('http://localhost:3001/api/imports/upload', {
  method: 'POST',
  headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
  body
});

const data = await res.json();
console.log(JSON.stringify(data, null, 2));
