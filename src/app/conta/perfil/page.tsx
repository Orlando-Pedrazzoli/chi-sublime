import type { Metadata } from 'next';
import { requireClient } from '@/lib/auth/permissions';
import { connectDB } from '@/lib/db/connect';
import { User } from '@/lib/models/User';
import { ProfileForm } from '@/components/client-area/ProfileForm';

export const metadata: Metadata = {
  title: 'Perfil',
};

export default async function ProfilePage() {
  const session = await requireClient();
  await connectDB();

  const user = await User.findById(session.id).lean();

  if (!user) {
    return (
      <div
        className="rounded-lg border p-8 text-sm"
        style={{
          backgroundColor: 'rgba(178,60,60,0.05)',
          borderColor: 'rgba(178,60,60,0.3)',
          color: '#B23C3C',
        }}
      >
        Erro ao carregar perfil.
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h2 className="mb-1 font-serif text-3xl" style={{ color: '#1A1A1A' }}>
          O meu perfil
        </h2>
        <p className="text-sm" style={{ color: '#5A5A5A' }}>
          Mantém os teus dados actualizados para receberes a melhor experiência.
        </p>
      </div>

      <div
        className="rounded-lg border p-6 sm:p-8"
        style={{
          backgroundColor: '#FFFFFF',
          borderColor: 'rgba(31,61,46,0.08)',
        }}
      >
        <ProfileForm
          initial={{
            name: user.name,
            email: user.email,
            phone: user.phone,
          }}
        />
      </div>
    </div>
  );
}
