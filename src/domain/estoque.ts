/** Regras de negócio independentes do Firebase. */
export function quantidadeValida(valor: number): boolean {
  return Number.isInteger(valor) && valor > 0 && valor <= 100_000;
}

export function calcularNovoSaldo(saldo: number, quantidade: number, tipo: 'entrada' | 'saida'): number {
  if (!Number.isInteger(saldo) || saldo < 0 || !quantidadeValida(quantidade)) {
    throw new Error('Saldo ou quantidade inválidos.');
  }
  const novoSaldo = tipo === 'entrada' ? saldo + quantidade : saldo - quantidade;
  if (novoSaldo < 0) throw new Error('Estoque insuficiente para essa saída.');
  if (novoSaldo > 100_000) throw new Error('Estoque acima do limite permitido.');
  return novoSaldo;
}
