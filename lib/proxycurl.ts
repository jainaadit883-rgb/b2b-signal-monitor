const LINKEDIN_URLS: Record<string, string> = {
  'Meesho':    'https://www.linkedin.com/company/meesho/',
  'Delhivery': 'https://www.linkedin.com/company/delhivery/',
  'Razorpay':  'https://www.linkedin.com/company/razorpay/',
  'Moglix':    'https://www.linkedin.com/company/moglix/',
  'Udaan':     'https://www.linkedin.com/company/udaan-com/',
  'Licious':   'https://www.linkedin.com/company/licious/',
  'Zetwerk':   'https://www.linkedin.com/company/zetwerk/',
  'Purplle':   'https://www.linkedin.com/company/purplle/',
  'Shadowfax': 'https://www.linkedin.com/company/shadowfax-technologies/',
  'Servify':   'https://www.linkedin.com/company/servify/',
}

export interface ProxycurlPerson {
  name: string
  title: string
  linkedinUrl: string
}

export async function findPocAtCompany(companyName: string): Promise<ProxycurlPerson | null> {
  const apiKey = process.env.PROXYCURL_API_KEY
  if (!apiKey) return null

  const linkedinUrl = LINKEDIN_URLS[companyName]
  if (!linkedinUrl) return null

  try {
    const params = new URLSearchParams({
      linkedin_company_url: linkedinUrl,
      keyword_regex: 'CHRO|Chief Human|VP HR|VP People|Head of HR|Head of People|VP Operations|Chief Operating',
      page_size: '1',
      employment_status: 'current',
    })

    const res = await fetch(
      `https://nubela.co/proxycurl/api/linkedin/company/employees/search?${params}`,
      { headers: { Authorization: `Bearer ${apiKey}` } }
    )

    if (!res.ok) return null
    const data = await res.json()
    const person = data.employees?.[0]
    if (!person) return null

    return {
      name: person.name || '',
      title: person.title || '',
      linkedinUrl: person.profile_url || '',
    }
  } catch {
    return null
  }
}
