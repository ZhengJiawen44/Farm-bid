const axios = require('axios');

const API_URL = 'http://localhost:5000/api'; // Adjust this for your API

// Retrieve the token from local storage
const getToken = () => localStorage.getItem('token');

// Fetch all blog posts
const getBlogPosts = () => axios.get(`${API_URL}/blogs`);

// Fetch a single blog post by ID (with comments)
const getBlogPost = (id) => axios.get(`${API_URL}/blogs/${id}`);

// Create a new blog post
const createBlogPost = (data) =>
  axios.post(`${API_URL}/blogs/create`, data, {
    headers: {
      Authorization: `Bearer ${getToken()}`, // Attach token for authenticated requests
    },
  });

// Add a comment to a blog post
const addCommentToBlogPost = (blogId, commentData) =>
  axios.post(`${API_URL}/blogs/${blogId}/comments`, commentData, {
    headers: {
      Authorization: `Bearer ${getToken()}`, // Attach token for authenticated requests
    },
  });

module.exports =  {
  getBlogPosts,
  getBlogPost,
  createBlogPost,
  addCommentToBlogPost,
};
