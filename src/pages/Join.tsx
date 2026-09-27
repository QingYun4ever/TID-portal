import { LinkButton, EmptyState, ErrorState, PageHero, Section, Skeleton, TableWrap, Td, Th } from '@/components/ui';
import { PublicApi } from '@/lib/api';
import { useApi, useTitle } from '@/lib/hooks';

interface Admission {
  id: number;
  name: string;
  className: string;
}

export default function Join() {
  useTitle('加入我们');
  const { data, loading, error, reload } = useApi<{ admissions: Admission[] }>(() => PublicApi.join(), []);
  const admissions = data?.admissions ?? [];

  return (
    <>
      <PageHero
        eyebrow="Join Us"
        title="加入我们"
        description="科技创新部录取名单。"
        breadcrumb={[{ label: '加入我们' }]}
      />

      <Section
        id="approved"
        eyebrow="Admission List"
        title="录取名单"
        description={loading || error ? undefined : `本次共录取 ${admissions.length} 位同学。`}
        action={<LinkButton to="/feedback">联系与反馈</LinkButton>}
      >
        {loading ? (
          <Skeleton className="h-80" />
        ) : error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : admissions.length ? (
          <TableWrap>
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <Th className="w-20">序号</Th>
                  <Th>姓名</Th>
                  <Th>班级</Th>
                </tr>
              </thead>
              <tbody>
                {admissions.map((student, index) => (
                  <tr key={student.id} className="transition-colors hover:bg-white/[0.03]">
                    <Td className="mono text-muted-foreground">{index + 1}</Td>
                    <Td className="font-medium text-foreground">{student.name}</Td>
                    <Td className="text-muted-foreground">{student.className}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        ) : (
          <EmptyState title="暂无录取名单" description="录取信息发布后将在这里展示。" />
        )}
      </Section>
    </>
  );
}
