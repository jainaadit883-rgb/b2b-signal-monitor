export async function fetchJobSignals(companyName: string): Promise<string> {
  const query = encodeURIComponent(`${companyName} hiring recruitment HR workforce payroll`)
  const url = `https://newsdata.io/api/1/latest?apikey=${process.env.NEWSDATA_API_KEY}&q=${query}&country=in&language=en&size=3`

  try {
    const res = await fetch(url, { next: { revalidate: 0 } })
    if (!res.ok) return ''
    const data = await res.json()
    if (data.status !== 'success') return ''

    return (data.results || [])
      .map((item: Record<string, string>) => `- [${item.pubDate}] ${item.title}: ${item.description}`)
      .join('\n')
  } catch {
    return ''
  }
}
