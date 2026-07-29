import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { RegisterDto } from './register.dto';

describe('RegisterDto — contraseña mínima', () => {
  const base = { name: 'Ana', email: 'ana@example.com' };

  it('rechaza contraseñas de menos de 6 caracteres', () => {
    const dto = plainToInstance(RegisterDto, { ...base, password: '12345' });
    const errors = validateSync(dto);
    expect(errors.some((e) => e.property === 'password')).toBe(true);
  });

  it('acepta contraseñas de 6 o más caracteres', () => {
    const dto = plainToInstance(RegisterDto, { ...base, password: '123456' });
    expect(validateSync(dto)).toHaveLength(0);
  });
});
