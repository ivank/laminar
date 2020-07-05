import { axiosOapi } from './petstore.types';
import axios from 'axios';

const petstore = axiosOapi(axios.create({ baseURL: 'https://petstore.swagger.io/v2' }));

const main = async () => {
  const { data: pixel } = await petstore['PUT /pet']({
    name: 'Pixel',
    photoUrls: ['https://placekitten.com/g/200/300'],
    tags: [{ name: 'axios-oapi-cli' }],
  });

  console.log('SAVED', pixel);

  const { data: retrievedPixel } = await petstore['GET /pet/{petId}'](pixel.id!);

  console.log('RETRIEVED', retrievedPixel);

  // Use the underlying api to perform custom requests
  const { data: inventory } = await petstore.api.get('/store/inventory');
  console.log('INVENTORY', inventory);
};

main();
