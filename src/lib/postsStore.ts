
// This file is no longer used for storing post data as of Firestore integration.
// It can be deleted or kept for reference if it contains other non-post related mock data.
// For now, I will empty it to signify its deprecation for posts.

export type Post_DEPRECATED = {
  id: string; // slug
  title: string;
  content: string;
  tags: string[];
  createdAt: string; // ISO date string
  updatedAt?: string; // ISO date string
  userId?: string; 
};

// const mockProfileUserId = 'user-fayeerzk-id';

// const initialPostsData_DEPRECATED: Post_DEPRECATED[] = [
//   {
//     id: 'hello-world',
//     title: 'Hello World: My First Post',
//     content: 'This is the content of my very first blog post. Welcome to WitWaves! We are excited to share thoughts and ideas with you. Stay tuned for more interesting articles covering a wide range of topics. Feel free to explore and engage with our community.',
//     tags: ['welcome', 'first-post', 'introduction'],
//     createdAt: new Date(2023, 0, 15, 10, 30, 0).toISOString(),
//     userId: mockProfileUserId,
//   },
// ];

// export const posts_DEPRECATED: Post_DEPRECATED[] = [...initialPostsData_DEPRECATED];

// This file is effectively deprecated for posts.
// Firestore is now the source of truth.
