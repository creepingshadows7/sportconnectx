/* eslint-env node */
const base = 'http://localhost:4000/api';
const fetchFn = globalThis.fetch;

async function main() {
  const postsRes = await fetchFn(`${base}/blog-posts`);
  const posts = await postsRes.json();
  console.log('posts length', posts.length);
  const first = posts[0];
  console.log('first id', first?.id);
  const url = `${base}/blog-posts/${first.id}/comments`;
  console.log('url', url);
  const commentRes = await fetchFn(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      authorId: first.authorId,
      message: 'Comment via HTTP test',
    }),
  });
  console.log('status', commentRes.status);
  const text = await commentRes.text();
  console.log(text);
}

main().catch((error) => {
  console.error(error);
  // eslint-disable-next-line no-undef
  process.exit(1);
});

