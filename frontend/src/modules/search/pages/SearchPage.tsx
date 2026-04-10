import { useState, type SubmitEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Search as SearchIcon, Sparkles } from 'lucide-react';
import { documentsApi } from '../../../lib/api';
import { Button } from '../../../components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../../components/ui/card';
import { Input } from '../../../components/ui/input';

export function SearchPage() {
  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState(10);

  const searchMutation = useMutation({
    mutationFn: ({ q, l }: { q: string; l: number }) => documentsApi.search(q, l),
  });

  function onSubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!query.trim()) return;
    searchMutation.mutate({ q: query.trim(), l: limit });
  }

  return (
    <section className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-orange-300" />
            Semantic Search
          </CardTitle>
          <CardDescription>
            Ask in natural language and retrieve the most relevant chunks.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-[1fr_150px_auto] md:items-end" onSubmit={onSubmit}>
            <div className="space-y-2">
              <label className="text-sm text-zinc-300">Query</label>
              <Input value={query} onChange={(e) => setQuery(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-zinc-300">Limit</label>
              <Input
                type="number"
                min={1}
                max={50}
                value={limit}
                onChange={(e) => {
                  const value = Number(e.target.value);
                  if(!Number.isNaN(value) && value >= 1 && value <= 50){
                    setLimit(value);
                  }
                }}
              />
            </div>
            <Button type="submit" disabled={searchMutation.isPending}>
              <SearchIcon className="mr-2 h-4 w-4" />
              {searchMutation.isPending ? 'Searching...' : 'Search'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Results</CardTitle>
          <CardDescription>Sorted by similarity score.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {searchMutation.isError ? (
            <p className="text-sm text-rose-300">Search request failed.</p>
          ) : null}

          {searchMutation.data?.results.map((r) => (
            <article
              key={`${r.documentId}-${r.chunkIndex}`}
              className="space-y-2 rounded-xl border border-zinc-800 bg-zinc-900 p-4"
            >
              <p className="text-sm text-zinc-300">
                <span className="font-medium text-zinc-100">{r.originalName}</span>
                <span className="mx-2 text-zinc-500">•</span>
                score {r.score.toFixed(3)}
                <span className="mx-2 text-zinc-500">•</span>
                chunk #{r.chunkIndex}
              </p>
              <p className="text-sm leading-relaxed text-zinc-300">{r.text}</p>
            </article>
          ))}
        </CardContent>
      </Card>
    </section>
  );
}
