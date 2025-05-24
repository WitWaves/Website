
export type MockAuthor = {
  id: string;
  name: string;
  role: string;
  avatarUrl: string;
};

const mockAuthorsData: MockAuthor[] = [
  {
    id: '1',
    name: 'Alex Bhati',
    role: 'Web Developer',
    avatarUrl: 'https://placehold.co/40x40.png?text=AB',
  },
  {
    id: '2',
    name: 'Jane Doe',
    role: 'Content Strategist',
    avatarUrl: 'https://placehold.co/40x40.png?text=JD',
  },
  {
    id: '3',
    name: 'Mike Lee',
    role: 'UX Designer',
    avatarUrl: 'https://placehold.co/40x40.png?text=ML',
  },
  {
    id: '4',
    name: 'Sarah Chen',
    role: 'AI Researcher',
    avatarUrl: 'https://placehold.co/40x40.png?text=SC',
  },
];

export async function getMockAuthors(): Promise<MockAuthor[]> {
  return [...mockAuthorsData];
}

export async function getMockAuthor(id: string): Promise<MockAuthor | undefined> {
  return mockAuthorsData.find(author => author.id === id);
}
