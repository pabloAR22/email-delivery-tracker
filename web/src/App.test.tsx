import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from './mocks/server';
import App from './App';

const rows = () => screen.getAllByRole('row').slice(1);
const loaded = () => screen.findByText('ana0@example.com'); // primera fila de los datos sintéticos

test('muestra los correos y el resumen por estado', async () => {
  render(<App />);
  await loaded();
  expect(rows()).toHaveLength(40);
  const resumen = screen.getByRole('region', { name: 'Resumen por estado' });
  expect(within(resumen).getByRole('button', { name: /Rebotado/ })).toHaveTextContent('10');
});

test('filtrar por estado desde las tarjetas deja solo esos correos', async () => {
  const user = userEvent.setup();
  render(<App />);
  await loaded();
  await user.click(screen.getByRole('button', { name: /Rebotado/ }));
  await screen.findByText('Rebotado', { selector: 'option:checked' });
  await vi.waitFor(() => expect(rows()).toHaveLength(10));
  rows().forEach((r) => expect(within(r).getByText('Rebotado')).toBeInTheDocument());
});

test('buscar por destinatario y limpiar los filtros', async () => {
  const user = userEvent.setup();
  render(<App />);
  await loaded();
  await user.type(screen.getByLabelText('Destinatario'), 'bounce');
  await vi.waitFor(() => expect(rows()).toHaveLength(5));
  await user.click(screen.getByRole('button', { name: 'Limpiar' }));
  await vi.waitFor(() => expect(rows()).toHaveLength(40));
});

test('sin coincidencias muestra un mensaje', async () => {
  const user = userEvent.setup();
  render(<App />);
  await loaded();
  await user.type(screen.getByLabelText('Destinatario'), 'nadie-con-este-nombre');
  expect(await screen.findByText('Ningún correo coincide con los filtros.')).toBeInTheDocument();
});

test('si la API falla muestra el error y permite reintentar', async () => {
  const user = userEvent.setup();
  server.use(http.get('/emails', () => new HttpResponse(null, { status: 500 })));
  render(<App />);
  expect(await screen.findByRole('alert')).toHaveTextContent('La API respondió 500');
  server.resetHandlers();
  await user.click(screen.getByRole('button', { name: 'Reintentar' }));
  await vi.waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
  expect(rows()).toHaveLength(40);
});
