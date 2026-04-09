import createInstance from '../libs/axios.js';

const instance = createInstance(import.meta.env.VITE_API_APP);

export default instance;

