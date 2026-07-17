import SupportAdminClient from './SupportAdminClient'

export default async function SupportAdminPage({ searchParams }: { searchParams: Promise<{ chat?: string }> }) {
  const { chat } = await searchParams
  return <SupportAdminClient initialChatId={chat} />
}
