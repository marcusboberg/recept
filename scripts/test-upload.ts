import { POST } from '../app/api/upload/route.ts';

async function run() {
  process.env.NODE_ENV = 'development';
  delete process.env.GITHUB_OWNER;
  delete process.env.GITHUB_REPO;
  delete process.env.GITHUB_TOKEN;
  const file = new File([Buffer.from('hello')], 'test.png', { type: 'image/png' });
  const formData = new FormData();
  formData.append('file', file);
  const request = new Request('http://localhost/api/upload', {
    method: 'POST',
    body: formData,
  });
  const response = await POST(request);
  console.log(response.status, await response.text());
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
