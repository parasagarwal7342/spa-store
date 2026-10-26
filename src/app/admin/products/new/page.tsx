import EditProduct from '../[id]/page';

export const metadata = { title: 'Add product' };

export default function NewProduct() {
  return <EditProduct params={Promise.resolve({ id: 'new' })} />;
}
