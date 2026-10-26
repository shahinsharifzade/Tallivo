import { Link } from 'react-router-dom';
import { buttonClass } from '../components/styles';
import { EmptyState } from '../components/ui';
import { az } from '../i18n/az';

export function NotFoundPage({ title = az.notFound.title }: { title?: string }) {
  return (
    <EmptyState
      title={title}
      action={
        <Link to="/" className={buttonClass('secondary')}>
          {az.notFound.home}
        </Link>
      }
    />
  );
}
