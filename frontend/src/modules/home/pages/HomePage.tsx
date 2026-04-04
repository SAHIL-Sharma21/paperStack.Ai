import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAppSelector } from '../../../app/hooks';
import { selectIsAuthenticated } from '../../auth/store/selectors';
import { Button } from '../../../components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../../components/ui/card';

export function HomePage() {
  const isAuthenticated = useAppSelector(selectIsAuthenticated);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-3xl">Knowledge Search, beautifully simple</CardTitle>
        <CardDescription>
          Upload documents, index them, and run semantic search with a warm dark interface.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex items-center gap-3">
        <Link to={isAuthenticated ? '/documents' : '/login'}>
          <Button>
            {isAuthenticated ? 'Go to Documents' : 'Get Started'}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
