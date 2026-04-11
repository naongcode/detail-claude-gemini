import AppLayout from '@/components/AppLayout'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ProjectPage({ params }: Props) {
  const { id } = await params
  return <AppLayout projectId={id} />
}
