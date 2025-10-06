export { default as Post } from './Post.svelte';

import Profile from './home/Profile.svelte';
import Pinned from './home/Pinned.svelte';
import Github from './home/Github.svelte';
import About from './home/About.svelte';

export const Home = { Profile, Pinned, Github, About };
