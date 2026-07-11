// 📄 src/components/admin/checkout/QuickClientCreate.tsx
'use client';

import { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input, FieldError } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { useToast } from '@/hooks/useToast';
import { createClientAction } from '@/lib/server-actions/clients';
import { NifInput } from './NifInput';

export type QuickClientCreateProps = {
  open: boolean;
  onClose: () => void;
  onCreated: (client: { id: string; name: string }) => void;
  initialName?: string;
};

/** Criação rápida de cliente no balcão (nome + telefone + NIF opcional). */
export function QuickClientCreate({
  open,
  onClose,
  onCreated,
  initialName,
}: QuickClientCreateProps) {
  const toast = useToast();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [nif, setNif] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    /* eslint-disable react-hooks/set-state-in-effect */
    setName(initialName ?? '');
    setPhone('');
    setNif('');
    setError(null);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [open, initialName]);

  const save = async () => {
    if (!name.trim() || !phone.trim()) {
      setError('Nome e telefone são obrigatórios');
      return;
    }
    setSaving(true);
    const res = await createClientAction({
      name: name.trim(),
      phone: phone.trim(),
      fiscalData: nif.trim() ? { vatNumber: nif.trim() } : undefined,
    });
    setSaving(false);
    if (res.success) {
      toast.success('Cliente criado');
      onCreated({ id: res.data.id, name: name.trim() });
      onClose();
    } else {
      setError(res.error.message);
    }
  };

  return (
    <Modal
      open={open}
      onClose={() => !saving && onClose()}
      title="Novo cliente rápido"
      size="sm"
      dismissable={!saving}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={save} loading={saving}>
            Criar
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <Label required>Nome</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </div>
        <div>
          <Label required>Telefone</Label>
          <Input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="912 345 678"
          />
        </div>
        <div>
          <Label>NIF</Label>
          <NifInput value={nif} onChange={setNif} />
        </div>
        {error && <FieldError>{error}</FieldError>}
      </div>
    </Modal>
  );
}
