DEFAULT_TEACHING = [
    {'label': 'Peer to peer learning', 'checked': True},
    {'label': 'Mini projects', 'checked': True},
    {'label': 'Flipped classroom', 'checked': False},
    {'label': 'Case study based learning', 'checked': False},
    {'label': 'Industry expert talk', 'checked': False},
]

DEFAULT_WEAK = [
    {'action': '', 'assignment': ''},
]

DEFAULT_BRIGHT = [
    {'action': '', 'assignment': ''},
]

DEFAULT_EVAL = [
    {'label': 'Mini project based evaluation', 'checked': True},
    {'label': 'Case study based evaluation', 'checked': False},
    {'label': 'Open book test', 'checked': False},
    {'label': 'Presentation/viva based evaluation', 'checked': False},
]

DEFAULT_GUIDELINES = [
    'Maximum score of bottom 10% students in T1/T2 is the cutoff to decide the Weak Learners.',
    'Minimum score of top 10% students in T1/T2 is the cutoff to decide the Bright Students.',
    'For different courses, strategy can be made by the faculty member based on the observed performance of students in the class.',
]

DEFAULT_EFFORTS = [
    {
        'strategy': 'Extra classes to be arranged for weak learners to practice more questions/ discuss more examples. Bright students may assist in conducting these classes.',
        'outcomes': 'Weak learners will develop a better understanding and perform better. Bright students will develop people management and teaching skills.',
        'documents': 'Study materials/assignments/tutorials, attendance sheet of participants and the bright students.',
    },
    {
        'strategy': 'Bright students may be assigned a real life project and demonstrate it to the class.',
        'outcomes': 'Bright students will develop problem solving, project development, presentation and demonstration skills.',
        'documents': 'Project report, working module and the schedule of demonstration along with attendance sheet.',
    },
    {
        'strategy': 'Bright students may study some contemporary techniques/technologies related to the course and present their findings to the class.',
        'outcomes': 'Bright students will develop self learning ability, analysis skills and presentation skills.',
        'documents': 'Study report and the schedule of presentation along with attendance sheet.',
    },
]

DEFAULT_IMPACT = [
    'Show the improvements in Weak Learners by listing their scores in T1, T2 and T3.',
    'Survey to be conducted to analyze the satisfaction level (in terms of skill development) of bright students involved in these tasks.',
]
