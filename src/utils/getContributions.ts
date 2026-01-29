interface ContributionDay {
  date: string;
  count: number;
}

async function getGitHubData(
  username: string,
): Promise<Record<string, number>> {
  const query = `
    query($username: String!) {
      user(login: $username) {
        contributionsCollection {
          contributionCalendar {
            weeks {
              contributionDays {
                date
                contributionCount
              }
            }
          }
        }
      }
    }
  `;

  const response = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${import.meta.env.GITHUB_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables: { username } }),
  });

  const json = await response.json();
  const weeks =
    json.data.user.contributionsCollection.contributionCalendar.weeks;

  const contributions: Record<string, number> = {};

  weeks.forEach((week: any) => {
    week.contributionDays.forEach((day: any) => {
      contributions[day.date] = day.contributionCount;
    });
  });

  return contributions;
}

async function getGitLabData(userId: string): Promise<Record<string, number>> {
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  const afterDate = oneYearAgo.toISOString().split('T')[0];

  const response = await fetch(
    `https://gitlab.com/api/v4/users/${userId}/events?after=${afterDate}&per_page=100`,
    {
      headers: {
        'PRIVATE-TOKEN': import.meta.env.GITLAB_TOKEN,
      },
    },
  );

  const events = await response.json();
  const contributions: Record<string, number> = {};

  events.forEach((event: any) => {
    const date = event.created_at.split('T')[0];
    contributions[date] = (contributions[date] || 0) + 1;
  });

  return contributions;
}

export async function getCombinedContributions(username: string) {
  const githubData = await getGitHubData(username);
  const gitlabData = await getGitLabData(username);

  const mergedData: Record<string, number> = { ...githubData };

  // Sumar GitLab a GitHub
  Object.keys(gitlabData).forEach((date) => {
    if (mergedData[date]) {
      mergedData[date] += gitlabData[date];
    } else {
      mergedData[date] = gitlabData[date];
    }
  });

  // Convertir to an array
  return Object.keys(mergedData)
    .map((date) => ({
      date,
      count: mergedData[date],
      level: getLevel(mergedData[date]),
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

// Función auxiliar para asignar niveles de intensidad (como GitHub)
function getLevel(count: number) {
  if (count === 0) return 0;
  if (count <= 3) return 1;
  if (count <= 6) return 2;
  if (count <= 9) return 3;
  return 4;
}
