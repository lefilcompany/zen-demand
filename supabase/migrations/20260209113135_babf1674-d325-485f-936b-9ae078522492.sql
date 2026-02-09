-- Add new columns to profiles
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS state text,
  ADD COLUMN IF NOT EXISTS city text;

-- Update trigger to capture all metadata fields
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, phone, state, city)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', 'Usuário'),
    new.raw_user_meta_data->>'avatar_url',
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'state',
    new.raw_user_meta_data->>'city'
  );
  
  -- First user is admin
  IF (SELECT COUNT(*) FROM public.profiles) = 1 THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (new.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role)
    VALUES (new.id, 'member');
  END IF;
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;