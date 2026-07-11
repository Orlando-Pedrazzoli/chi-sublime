// 📄 src/components/admin/transactions/ExpenseForm.tsx
'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Drawer } from '@/components/ui/Drawer';
import { Button } from '@/components/ui/Button';
import { Input, FieldError } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { Checkbox } from '@/components/ui/Checkbox';
import { DatePicker } from '@/components/ui/DatePicker';
import { Label } from '@/components/ui/Label';
import { useToast } from '@/hooks/useToast';
import { eurosToCents } from '@/lib/utils/cents';
import {
  createExpenseAction,
  listExpenseCategoriesAction,
} from '@/lib/server-actions/transactions';
import type { FinanceCategoryItem } from '@/types/transaction';

type FormValues = {
  expenseCategoryId: string;
  amountEuros: string;
  vatRate: string;
  supplier: string;
  supplierInvoiceNumber: string;
  date: string;
  method: string;
  description: string;
  notes: string;
  recurringEnabled: boolean;
  frequency: 'weekly' | 'monthly' | 'yearly';
  nextDueDate: string;
};

const DEFAULTS: FormValues = {
  expenseCategoryId: '',
  amountEuros: '',
  vatRate: '23',
  supplier: '',
  supplierInvoiceNumber: '',
  date: '',
  method: 'transfer',
  description: '',
  notes: '',
  recurringEnabled: false,
  frequency: 'monthly',
  nextDueDate: '',
};

const ERROR_KEY_MAP: Record<string, keyof FormValues> = {
  expenseCategoryId: 'expenseCategoryId',
  amount: 'amountEuros',
  vatRate: 'vatRate',
  supplier: 'supplier',
  supplierInvoiceNumber: 'supplierInvoiceNumber',
  paymentMethod: 'method',
};

function parseEuros(v: string): number {
  const n = parseFloat(v.replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

export type ExpenseFormProps = {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
};

export function ExpenseForm({ open, onClose, onSaved }: ExpenseFormProps) {
  const toast = useToast();
  const [categories, setCategories] = useState<FinanceCategoryItem[]>([]);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ defaultValues: DEFAULTS });

  useEffect(() => {
    if (!open) return;
    reset(DEFAULTS);
    (async () => {
      const res = await listExpenseCategoriesAction();
      if (res.success) setCategories(res.data.filter((c) => c.active));
    })();
  }, [open, reset]);

  const onSubmit = handleSubmit(async (v) => {
    if (v.recurringEnabled && !v.nextDueDate) {
      setError('nextDueDate', { message: 'Indica a próxima data' });
      return;
    }
    const payload = {
      expenseCategoryId: v.expenseCategoryId,
      amount: eurosToCents(parseEuros(v.amountEuros)),
      vatRate: Number(v.vatRate),
      supplier: v.supplier.trim() || undefined,
      supplierInvoiceNumber: v.supplierInvoiceNumber.trim() || undefined,
      date: v.date || undefined,
      paymentMethod: v.method,
      description: v.description.trim() || undefined,
      notes: v.notes.trim() || undefined,
      recurring: v.recurringEnabled
        ? { enabled: true, frequency: v.frequency, nextDueDate: v.nextDueDate }
        : undefined,
    };

    const res = await createExpenseAction(payload);
    if (res.success) {
      toast.success('Despesa registada');
      onSaved();
      onClose();
      return;
    }
    const fe = res.error.fieldErrors;
    if (fe) {
      for (const [key, msgs] of Object.entries(fe)) {
        const path = ERROR_KEY_MAP[key];
        if (path && msgs[0]) setError(path, { message: msgs[0] });
      }
    }
    toast.error(res.error.message);
  });

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Nova despesa"
      description="Registar uma despesa do salão"
      size="md"
      dismissable={!isSubmitting}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" form="expense-form" loading={isSubmitting}>
            Registar despesa
          </Button>
        </>
      }
    >
      <form id="expense-form" onSubmit={onSubmit} className="space-y-5">
        <div>
          <Label required>Categoria</Label>
          <Select
            {...register('expenseCategoryId', { required: 'Categoria obrigatória' })}
            error={!!errors.expenseCategoryId}
          >
            <option value="">Seleciona…</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <FieldError>{errors.expenseCategoryId?.message}</FieldError>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div>
            <Label required>Valor (€)</Label>
            <Input
              inputMode="decimal"
              {...register('amountEuros', { required: 'Valor obrigatório' })}
              error={!!errors.amountEuros}
              placeholder="0,00"
            />
            <FieldError>{errors.amountEuros?.message}</FieldError>
          </div>
          <div>
            <Label>IVA</Label>
            <Select {...register('vatRate')}>
              <option value="23">23%</option>
              <option value="13">13%</option>
              <option value="6">6%</option>
              <option value="0">Isento</option>
            </Select>
          </div>
          <div>
            <Label>Data</Label>
            <DatePicker {...register('date')} />
          </div>
        </div>

        <div>
          <Label>Método de pagamento</Label>
          <Select {...register('method')}>
            <option value="transfer">Transferência</option>
            <option value="cash">Numerário</option>
            <option value="multibanco">Multibanco</option>
            <option value="mb_way">MB WAY</option>
            <option value="card_terminal">Cartão</option>
            <option value="other">Outro</option>
          </Select>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label>Fornecedor</Label>
            <Input {...register('supplier')} error={!!errors.supplier} />
          </div>
          <div>
            <Label>Nº fatura do fornecedor</Label>
            <Input {...register('supplierInvoiceNumber')} error={!!errors.supplierInvoiceNumber} />
          </div>
        </div>

        <div>
          <Label>Descrição</Label>
          <Input {...register('description')} placeholder="Ex: compra de tintas" />
        </div>
        <div>
          <Label>Notas</Label>
          <Textarea {...register('notes')} rows={2} />
        </div>

        <div className="border-chi-border-light bg-chi-cream/40 space-y-4 rounded-md border p-4">
          <Checkbox {...register('recurringEnabled')} label="Despesa recorrente" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label>Frequência</Label>
              <Select {...register('frequency')}>
                <option value="weekly">Semanal</option>
                <option value="monthly">Mensal</option>
                <option value="yearly">Anual</option>
              </Select>
            </div>
            <div>
              <Label>Próxima data</Label>
              <DatePicker {...register('nextDueDate')} error={!!errors.nextDueDate} />
              <FieldError>{errors.nextDueDate?.message}</FieldError>
            </div>
          </div>
        </div>
      </form>
    </Drawer>
  );
}
