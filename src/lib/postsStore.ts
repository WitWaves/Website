export type Post = {
  id: string; // slug
  title: string;
  content: string;
  tags: string[];
  createdAt: string; // ISO date string
  updatedAt?: string; // ISO date string
};

const initialPostsData: Post[] = [
  {
    id: 'hello-world',
    title: 'Hello World: My First Post',
    content: 'This is the content of my very first blog post. Welcome to WitWaves! We are excited to share thoughts and ideas with you. Stay tuned for more interesting articles covering a wide range of topics. Feel free to explore and engage with our community.',
    tags: ['welcome', 'first-post', 'introduction'],
    createdAt: new Date(2023, 0, 15, 10, 30, 0).toISOString(), // Jan 15, 2023
  },
  {
    id: 'nextjs-rocks',
    title: 'Why Next.JS is Awesome for Blogs',
    content: 'Exploring the features of Next.JS that make it a great choice for building modern blogs. Server components, the app router, image optimization, and static site generation are just a few reasons why developers love Next.JS. It provides a fantastic developer experience and excellent performance out of the box.',
    tags: ['nextjs', 'webdev', 'javascript', 'react'],
    createdAt: new Date(2023, 1, 20, 14, 0, 0).toISOString(), // Feb 20, 2023
  },
  {
    id: 'ai-in-writing',
    title: 'The Role of AI in Modern Writing',
    content: 'AI tools are changing how we write. From grammar checks to content generation, let\'s dive into the impact of AI on writing. We will explore various tools, ethical considerations, and the future of AI-assisted content creation. It is a rapidly evolving field with immense potential.',
    tags: ['ai', 'writing', 'technology', 'future'],
    createdAt: new Date(2024, 4, 10, 9, 0, 0).toISOString(), // May 10, 2024
  },
  {
    id: 'exploring-may-further',
    title: 'Exploring May Further',
    content: 'More thoughts and ideas shared in May 2024. This month has been full of interesting developments in technology and creative arts. We will delve into some specific topics that have caught our attention and share our perspectives.',
    tags: ['musings', 'technology', 'creativity'],
    createdAt: new Date(2024, 4, 25, 16, 45, 0).toISOString(), // May 25, 2024
  },
  {
    id: 'deep-dive-into-css-tricks',
    title: 'Deep Dive into Modern CSS Tricks',
    content: 'CSS has come a long way. This post explores some of the latest and greatest CSS features like Grid, Flexbox, custom properties, and container queries that can help you build stunning and responsive layouts with cleaner code.',
    tags: ['css', 'webdev', 'frontend', 'design'],
    createdAt: new Date(2024, 5, 5, 11, 0, 0).toISOString(), // June 5, 2024
  }
];

// This mutable array simulates a database.
// In a real application, you would use a proper database.
export const posts: Post[] = [...initialPostsData];
