"""Default PO / PSO text for B.Tech CSE, B.Tech IT, M.Tech CSE, M.Tech AIDS."""

BTECH_POS = [
    ('PO1', 'Engineering knowledge',
     'Apply the knowledge of mathematics, science, engineering fundamentals, and an engineering specialization to the solution of complex engineering problems.'),
    ('PO2', 'Problem analysis',
     'Identify, formulate, research literature, and analyze complex engineering problems reaching substantiated conclusions using first principles of mathematics, natural sciences, and engineering sciences.'),
    ('PO3', 'Design/development of solutions',
     'Design solutions for complex engineering problems and design system components or processes that meet the specified needs with appropriate consideration for the public health and safety, and the cultural, societal, and environmental considerations.'),
    ('PO4', 'Conduct investigations of complex problems',
     'Use research-based knowledge and research methods including design of experiments, analysis and interpretation of data, and synthesis of the information to provide valid conclusions.'),
    ('PO5', 'Modern tool usage',
     'Create, select, and apply appropriate techniques, resources, and modern engineering and IT tools including prediction and modelling to complex engineering activities with an understanding of the limitations.'),
    ('PO6', 'The engineer and society',
     'Apply reasoning informed by the contextual knowledge to assess societal, health, safety, legal and cultural issues and the consequent responsibilities relevant to the professional engineering practice.'),
    ('PO7', 'Environment and sustainability',
     'Understand the impact of the professional engineering solutions in societal and environmental contexts, and demonstrate the knowledge of, and need for sustainable development.'),
    ('PO8', 'Ethics',
     'Apply ethical principles and commit to professional ethics and responsibilities and norms of the engineering practice.'),
    ('PO9', 'Individual and team work',
     'Function effectively as an individual, and as a member or leader in diverse teams, and in multidisciplinary settings.'),
    ('PO10', 'Communication',
     'Communicate effectively on complex engineering activities with the engineering community and with society at large, such as, being able to comprehend and write effective reports and design documentation, make effective presentations, and give and receive clear instructions.'),
    ('PO11', 'Project management and finance',
     "Demonstrate knowledge and understanding of the engineering and management principles and apply these to one's own work, as a member and leader in a team, to manage projects and in multidisciplinary environments."),
    ('PO12', 'Life-long learning',
     'Recognize the need for, and have the preparation and ability to engage in independent and life-long learning in the broadest context of technological change.'),
]

SEED = [
    {
        'degree': 'BTECH',
        'branch': 'CSE',
        'name': 'B.Tech (CSE)',
        'slug': 'btech-cse',
        'order': 1,
        'pos': BTECH_POS,
        'pso_groups': [
            {
                'title': '',
                'items': [
                    ('PSO1', 'Able to identify suitable data structures and algorithms to design, develop and evaluate effective solutions for real-life and research problems.'),
                    ('PSO2', 'Able to excel in various programming/project competitions and technological challenges laid by professional societies.'),
                ],
            },
        ],
    },
    {
        'degree': 'BTECH',
        'branch': 'IT',
        'name': 'B.Tech (IT)',
        'slug': 'btech-it',
        'order': 2,
        'pos': BTECH_POS,
        'pso_groups': [
            {
                'title': '',
                'items': [
                    ('PSO1', 'Able to acquire practical competency with emerging technologies, programming languages and open source platforms.'),
                    ('PSO2', 'Able to assess hardware and software aspects necessary to develop IT based solutions.'),
                ],
            },
        ],
    },
    {
        'degree': 'MTECH',
        'branch': 'CSE',
        'name': 'M.Tech (CSE)',
        'slug': 'mtech-cse',
        'order': 3,
        'pos': [
            ('PO1', '', 'An ability to independently carry out research /investigation and development work to solve practical problems.'),
            ('PO2', '', 'An ability to write and present a substantial technical report/document.'),
            ('PO3', '', 'Students should be able to demonstrate a degree of mastery over the area as per the specialization of the program.'),
        ],
        'pso_groups': [
            {
                'title': 'M.Tech (CSE)',
                'items': [
                    ('PSO1', 'Students should be able to develop and implement the solution of real life computing problems using contemporary technologies.'),
                    ('PSO2', 'Students should be able to apply ethical principles and commit to professional and social responsibilities.'),
                ],
            },
            {
                'title': 'M.Tech (CSE with specialisation in DA)',
                'items': [
                    ('PSO1', 'Students should be able to engage in sustainable development and demonstrate data analysis skills for effective interpretation and decision making to solve real life problems.'),
                    ('PSO2', 'Students should be able to apply ethical principles and commit to professional and social responsibilities.'),
                ],
            },
            {
                'title': 'M.Tech (CSE with specialization in AI & ML)',
                'items': [
                    ('PSO1', 'Students should be able to design and develop sustainable solutions to real life problems using Artificial Intelligence and Machine Learning based solutions.'),
                    ('PSO2', 'Students should be able to apply ethical principles and commit to professional and social responsibilities.'),
                ],
            },
            {
                'title': 'M.Tech (CSE with specialization in IoT)',
                'items': [
                    ('PSO1', 'Students should be able to apply multidisciplinary approaches to design, development, simulate, and implement IoT based solution of various real life problems.'),
                    ('PSO2', 'Students should be able to apply ethical principles and commit to professional and social responsibilities.'),
                ],
            },
        ],
    },
    {
        'degree': 'MTECH',
        'branch': 'AIDS',
        'name': 'M.Tech (AI & DS)',
        'slug': 'mtech-aids',
        'order': 4,
        'pos': [
            ('PO1', '', 'An ability to independently carry out research /investigation and development work to solve real time problems.'),
            ('PO2', '', 'Ability to effectively communicate technical knowledge and research outcomes through reports and presentations.'),
            ('PO3', '', 'Students should be able to master core AI and ML concepts and apply them to innovate and lead intelligent system design.'),
        ],
        'pso_groups': [
            {
                'title': '',
                'items': [
                    ('PSO1', 'Students should be able to apply AI and Data Science techniques in multidisciplinary domains to design efficient, scalable, and impactful solutions.'),
                    ('PSO2', 'Students should be able to integrate ethical principles and social responsibility into the design and deployment of AI and data-driven technologies.'),
                ],
            },
        ],
    },
]


def seed_programmes(Programme, ProgrammeStatement):
    created = 0
    for row in SEED:
        obj, was_created = Programme.objects.get_or_create(
            slug=row['slug'],
            defaults={
                'degree': row['degree'],
                'branch': row['branch'],
                'name': row['name'],
                'order': row['order'],
            },
        )
        if not was_created and obj.statements.exists():
            continue
        if was_created:
            created += 1
        statements = []
        order = 0
        for code, title, text in row['pos']:
            statements.append(ProgrammeStatement(
                programme=obj, kind='PO', group_title='', code=code,
                title=title, statement=text, order=order,
            ))
            order += 1
        for group in row['pso_groups']:
            for code, text in group['items']:
                statements.append(ProgrammeStatement(
                    programme=obj, kind='PSO', group_title=group['title'],
                    code=code, title='', statement=text, order=order,
                ))
                order += 1
        ProgrammeStatement.objects.bulk_create(statements)
    return created
