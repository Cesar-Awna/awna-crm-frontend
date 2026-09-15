// Utilidades de RUT chileno (validación dígito verificador módulo 11 + formateo)

// Deja solo dígitos y K (mayúscula). Último carácter = DV.
export const limpiarRut = (rut) =>
  String(rut ?? '').replace(/[^0-9kK]/g, '').toUpperCase();

// Valida el RUT completo (cuerpo + dígito verificador) con módulo 11.
export const validarRut = (rut) => {
  const limpio = limpiarRut(rut);
  if (limpio.length < 2) return false;
  const cuerpo = limpio.slice(0, -1);
  const dv = limpio.slice(-1);
  if (!/^\d+$/.test(cuerpo)) return false;

  let suma = 0;
  let mult = 2;
  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += Number(cuerpo[i]) * mult;
    mult = mult === 7 ? 2 : mult + 1;
  }
  const resto = 11 - (suma % 11);
  const dvEsperado = resto === 11 ? '0' : resto === 10 ? 'K' : String(resto);
  return dv === dvEsperado;
};

// Formatea para mostrar: 12.345.678-9
export const formatearRut = (rut) => {
  const limpio = limpiarRut(rut);
  if (limpio.length === 0) return '';
  if (limpio.length === 1) return limpio;
  const cuerpo = limpio.slice(0, -1);
  const dv = limpio.slice(-1);
  const cuerpoFmt = cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${cuerpoFmt}-${dv}`;
};
