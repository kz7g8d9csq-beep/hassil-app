import axios from 'axios';

const API = axios.create({
  baseURL: 'http://localhost:3001/api', // هذا هو الرابط الصحيح الآن
});

export default API;