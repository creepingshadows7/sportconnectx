import { apiRequest } from './accountDb.js';

export const listBlogPosts = () => apiRequest('/blog-posts');

export const createBlogPost = (payload) => apiRequest('/blog-posts', {
  method: 'POST',
  body: payload,
});

export const deleteBlogPost = (id, actorId) => apiRequest(`/blog-posts/${id}`, {
  method: 'DELETE',
  body: { actorId },
});

export const createBlogComment = (postId, payload) => apiRequest(`/blog-posts/${postId}/comments`, {
  method: 'POST',
  body: payload,
});

export const listBlogPostComments = (postId) => apiRequest(`/blog-posts/${postId}/comments`);
