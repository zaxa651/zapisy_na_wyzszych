import { useCallback, useState } from 'react';
import { supabase } from '../../src/supabase/supabaseClient';

export type UserRole = 'student' | 'lecturer';

export interface RegisterForm {
  fullName: string;
  email: string;
  password: string;
  role: UserRole;
}

export function useRegister() {
  const [loading, setLoading] = useState(false);

  const signUp = useCallback(async (form: RegisterForm): Promise<void> => {
    setLoading(true);
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: { data: { full_name: form.fullName } },
      });

      if (signUpError) throw signUpError;
      if (!data.user) throw new Error('Пользователь не создан');

      const { error: profileError } = await supabase.from('profiles').upsert({
        id: data.user.id,
        email: form.email,
        full_name: form.fullName,
        role: form.role,
      });

      if (profileError) throw profileError;
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, signUp };
}