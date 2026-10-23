import { CUSTOMER_LIMITS, normalizeTags } from '@nexus/shared';
import { Plus, X } from 'lucide-react';
import { type KeyboardEvent, useId, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

interface TagInputProps {
  id?: string;
  value: string[];
  onChange: (tags: string[]) => void;
  suggestions?: string[];
  invalid?: boolean;
}

/** Campo de tags: Enter ou vírgula adiciona; Backspace com o campo vazio remove a última. */
export function TagInput({ id, value, onChange, suggestions = [], invalid }: TagInputProps) {
  const [draft, setDraft] = useState('');
  const hintId = useId();
  const full = value.length >= CUSTOMER_LIMITS.tags;

  const add = (raw: string) => {
    const tag = raw.trim().slice(0, CUSTOMER_LIMITS.tagLength);
    if (tag && !full) onChange(normalizeTags([...value, tag]));
    setDraft('');
  };

  const remove = (tag: string) => onChange(value.filter((item) => item !== tag));

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      add(draft);
    } else if (event.key === 'Backspace' && draft === '' && value.length > 0) {
      remove(value[value.length - 1]!);
    }
  };

  const selected = new Set(value.map((tag) => tag.toLocaleLowerCase('pt-BR')));
  const query = draft.trim().toLocaleLowerCase('pt-BR');
  const available = suggestions
    .filter((tag) => !selected.has(tag.toLocaleLowerCase('pt-BR')))
    .filter((tag) => !query || tag.toLocaleLowerCase('pt-BR').includes(query))
    .slice(0, 8);

  return (
    <div className="space-y-2">
      <div
        className="flex min-h-9 flex-wrap items-center gap-1.5 rounded-lg border border-input px-2 py-1.5 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 aria-invalid:border-destructive dark:bg-input/30"
        aria-invalid={invalid || undefined}
      >
        {value.map((tag) => (
          <Badge key={tag} variant="secondary" className="gap-1 pr-1 font-normal">
            {tag}
            <button
              type="button"
              onClick={() => remove(tag)}
              className="rounded-sm opacity-70 hover:opacity-100 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              aria-label={`Remover tag ${tag}`}
            >
              <X className="size-3" />
            </button>
          </Badge>
        ))}
        <Input
          id={id}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={onKeyDown}
          onBlur={() => draft.trim() && add(draft)}
          disabled={full}
          placeholder={full ? 'Limite de tags atingido' : 'Digite e pressione Enter'}
          aria-describedby={hintId}
          className="h-6 min-w-32 flex-1 border-0 bg-transparent px-1 shadow-none focus-visible:ring-0 dark:bg-transparent"
        />
      </div>
      <p id={hintId} className="sr-only">
        Pressione Enter ou vírgula para adicionar. Até {CUSTOMER_LIMITS.tags} tags.
      </p>
      {available.length > 0 && !full && (
        <div className="flex flex-wrap gap-1.5" aria-label="Sugestões de tags">
          {available.map((tag) => (
            <button
              key={tag}
              type="button"
              // Mantém o foco no campo: sem isso, o blur adicionaria o texto parcial como tag.
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => add(tag)}
              className="inline-flex items-center gap-1 rounded-full border border-dashed px-2 py-0.5 text-xs text-muted-foreground hover:border-primary hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <Plus className="size-3" />
              {tag}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
