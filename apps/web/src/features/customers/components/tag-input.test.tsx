import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { TagInput } from './tag-input';

function Harness({
  initial = [],
  suggestions = [],
}: {
  initial?: string[];
  suggestions?: string[];
}) {
  const [tags, setTags] = useState(initial);
  return (
    <>
      <TagInput id="tags" value={tags} onChange={setTags} suggestions={suggestions} />
      <output data-testid="value">{tags.join('|')}</output>
    </>
  );
}

describe('TagInput', () => {
  it('adiciona com Enter ou vírgula, sem duplicar', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const input = screen.getByRole('textbox');

    await user.type(input, 'Varejo{Enter}Atacado,varejo{Enter}');

    expect(screen.getByTestId('value')).toHaveTextContent('Varejo|Atacado');
  });

  it('remove pelo botão e com Backspace no campo vazio', async () => {
    const user = userEvent.setup();
    render(<Harness initial={['Varejo', 'Agro', 'SaaS']} />);

    await user.click(screen.getByRole('button', { name: 'Remover tag Agro' }));
    expect(screen.getByTestId('value')).toHaveTextContent('Varejo|SaaS');

    await user.type(screen.getByRole('textbox'), '{Backspace}');
    expect(screen.getByTestId('value')).toHaveTextContent('Varejo');
  });

  it('sugere tags existentes que ainda não foram usadas', async () => {
    const user = userEvent.setup();
    render(<Harness initial={['Varejo']} suggestions={['Varejo', 'Agro', 'Alimentação']} />);

    expect(screen.queryByRole('button', { name: 'Varejo' })).not.toBeInTheDocument();
    await user.type(screen.getByRole('textbox'), 'ali');
    expect(screen.queryByRole('button', { name: 'Agro' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Alimentação' }));
    expect(screen.getByTestId('value')).toHaveTextContent('Varejo|Alimentação');
  });

  it('bloqueia novas tags ao atingir o limite', () => {
    render(<Harness initial={Array.from({ length: 10 }, (_, index) => `tag ${index}`)} />);
    expect(screen.getByRole('textbox')).toBeDisabled();
    expect(screen.getByRole('textbox')).toHaveAttribute('placeholder', 'Limite de tags atingido');
  });
});
