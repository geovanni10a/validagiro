import { z } from 'zod';

const required = (message: string) => z.string().trim().min(1, message);

export const productSchema = z.object({
  name: required('Informe o nome do produto.'),
  brand: z.string(),
  categoryId: required('Selecione uma categoria.'),
  categoryName: z.string(),
  unitOfMeasure: z.enum(['UNIT', 'KG', 'L'], { message: 'Selecione a unidade de medida.' }),
  packageContentValue: z.string(),
  packageContentUnit: z.string(),
  salePrice: required('Informe o preço de venda.').refine(
    (value) => Number(value.replace(',', '.')) > 0,
    'Informe um preço maior que zero.',
  ),
  automaticPromotionEligible: z.enum(['true', 'false']),
});

export const batchSchema = z.object({
  expiryDate: required('Informe a data de validade.'),
  batchNumber: z.string(),
  quantity: required('Informe a quantidade.').refine(
    (value) => /^\d+$/.test(value) && Number(value) > 0,
    'Informe uma quantidade maior que zero.',
  ),
  locationId: required('Selecione onde o produto está armazenado.'),
  locationName: z.string(),
  entryDate: required('Informe a data de entrada.'),
  unitCost: z.string().refine(
    (value) => !value || Number(value.replace(',', '.')) >= 0,
    'Informe um custo válido.',
  ),
  observation: z.string().max(500, 'Use no máximo 500 caracteres.'),
}).superRefine((value, context) => {
  if (value.expiryDate && value.entryDate && value.expiryDate < value.entryDate) {
    context.addIssue({
      code: 'custom', path: ['expiryDate'],
      message: 'A validade é anterior à data de entrada.',
    });
  }
});

export type ProductInput = z.infer<typeof productSchema>;
export type BatchInput = z.infer<typeof batchSchema>;
