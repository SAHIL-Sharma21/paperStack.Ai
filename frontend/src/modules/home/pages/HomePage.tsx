import { ArrowRight, FolderOpen } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppSelector } from '../../../app/hooks';
import { selectIsAuthenticated } from '../../auth/store/selectors';
import { buttonVariants } from '../../../components/ui/button';
import { DocumentDropZone } from '../../../components/DocumentDropZone';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../../components/ui/card';
import { cn } from '../../../lib/utils';
import { LandingHeroIllustration } from '../components/LandingHeroIllustration';
import features from './homePageData';

export function HomePage() {
  const navigate = useNavigate();
  const isAuthenticated = useAppSelector(selectIsAuthenticated);

  if (!isAuthenticated) {
    return (
      <div className="space-y-16 pb-8 md:space-y-20 md:pb-14">
        <section className="relative overflow-hidden rounded-3xl border border-zinc-800/90 bg-zinc-900/50 shadow-[0_0_0_1px_rgba(255,255,255,.03),0_24px_80px_rgba(0,0,0,.45)] backdrop-blur-md">
          <div
            className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-orange-500/20 blur-3xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-amber-600/10 blur-3xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.35]"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }}
            aria-hidden
          />

          <div className="relative grid gap-12 p-8 md:gap-14 md:p-12 lg:grid-cols-[1fr_min(42%,min(400px,100%))] lg:items-center lg:p-14">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-400/90">
                Your document brain
              </p>
              <h1 className="mt-3 text-4xl font-bold leading-[1.1] tracking-tight text-zinc-50 md:text-5xl lg:text-[3.25rem]">
                Knowledge search,{' '}
                <span className="bg-linear-to-r from-orange-200 to-amber-400 bg-clip-text text-transparent">
                  beautifully simple
                </span>
              </h1>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-zinc-400 md:text-lg">
                PaperStack uploads your files, understands them with embeddings, and lets you search
                by meaning — not just filenames. One place for papers, notes, and reports.
              </p>
              <div className="mt-9 flex flex-wrap items-center gap-3">
                <Link
                  to="/signup"
                  className={cn(buttonVariants({ size: 'lg' }), 'gap-2 px-6')}
                >
                  Get started free
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  to="/login"
                  className={cn(
                    buttonVariants({ variant: 'secondary', size: 'lg' }),
                    'border border-zinc-700/80 bg-zinc-950/40',
                  )}
                >
                  Log in
                </Link>
              </div>
              <p className="mt-6 text-sm text-zinc-500">
                No credit card for signup · PDF & Word supported
              </p>
            </div>

            <div className="flex justify-center lg:justify-end">
              <LandingHeroIllustration />
            </div>
          </div>
        </section>

        <section aria-labelledby="landing-features-heading">
          <div className="text-center">
            <h2
              id="landing-features-heading"
              className="text-2xl font-semibold tracking-tight text-zinc-100 md:text-3xl"
            >
              Everything you need to search your stack
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm text-zinc-500 md:text-base">
              From upload to answers in a few clicks — tuned for students, researchers, and teams who
              live in documents.
            </p>
          </div>
          <ul className="mt-10 grid gap-5 md:grid-cols-3 md:gap-6">
            {features.map(({ icon: Icon, title, body }) => (
              <li
                key={title}
                className="group rounded-2xl border border-zinc-800/90 bg-zinc-900/40 p-6 shadow-[inset_0_1px_0_0_rgba(255,255,255,.04)] transition-colors hover:border-orange-500/20 hover:bg-zinc-900/60"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-500/15 text-orange-400 ring-1 ring-orange-400/20 transition-transform group-hover:scale-105">
                  <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                </span>
                <h3 className="mt-4 text-lg font-semibold text-zinc-100">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-500">{body}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="relative overflow-hidden rounded-3xl border border-orange-500/25 bg-linear-to-br from-orange-500/10 via-zinc-900/80 to-zinc-950 px-6 py-12 text-center md:px-12 md:py-14">
          <div
            className="pointer-events-none absolute inset-0 opacity-30"
            style={{
              backgroundImage:
                'radial-gradient(circle at 30% 20%, rgba(251,146,60,0.25), transparent 50%)',
            }}
            aria-hidden
          />
          <div className="relative mx-auto max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-orange-400/25 bg-orange-500/10 px-3 py-1 text-xs font-medium text-orange-200/90">
              <FolderOpen className="h-3.5 w-3.5" aria-hidden />
              Library &amp; search in one app
            </span>
            <h2 className="mt-5 text-2xl font-semibold tracking-tight text-zinc-50 md:text-3xl">
              Ready to stack your papers?
            </h2>
            <p className="mt-3 text-sm text-zinc-400 md:text-base">
              Create an account and start uploading. Your library and semantic search are waiting.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link to="/signup" className={cn(buttonVariants({ size: 'lg' }), 'gap-2')}>
                Create account
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/login" className={buttonVariants({ variant: 'secondary', size: 'lg' })}>
                I already have an account
              </Link>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle className="text-3xl">Knowledge Search, beautifully simple</CardTitle>
        <CardDescription>
          Drop a file below to upload. You will jump to your library when it finishes, where you can
          preview, download, and manage everything.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <DocumentDropZone
          onUploadSuccess={() =>
            navigate('/documents', { state: { uploadSuccess: true }, replace: false })
          }
        />
        <div className="flex flex-wrap items-center gap-3 border-t border-zinc-800/80 pt-6">
          <Link
            to="/documents"
            className={cn(buttonVariants({ variant: 'secondary' }), 'gap-2')}
          >
            Open library
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
