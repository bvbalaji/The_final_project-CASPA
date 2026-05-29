import pandas as pd
import numpy as np
from collections import defaultdict
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import AdaBoostClassifier, RandomForestClassifier
from sklearn.tree import DecisionTreeClassifier
from sklearn.naive_bayes import GaussianNB
from sklearn.svm import LinearSVC
from sklearn.calibration import CalibratedClassifierCV
import warnings
warnings.filterwarnings('ignore')

USER_CAREERS = [
    'AI & Machine Learning',
    'Computer Science & IT',
    'Robotics & Automation',
    'Manufacturing & Operations',
    'People & HR Management',
    'Aviation — Pilot',
    'Aviation — Ground & Cabin Crew',
    'Musician & Performing Arts',
    'Sports & Athletics',
    'Government Administration',
    'NGO & Social Service',
    'Medicine & Healthcare',
    'Teaching & Education',
    'Research Scientist',
    'Judiciary & Law',
    'Films & Acting',
    'Content Creation & Media',
    'Environmental Science & Conservation',
    'Politics & Public Policy',
    'Writing, Poetry & Literature',
    'Hospitality & Tourism',
    'Civil Service & Administration',
    'Law Enforcement & Security',
    'Alternative & Holistic Medicine',
    'Business & Entrepreneurship',
    'Defence & Armed Forces',
    'E-Commerce & Digital Business',
    'Postal & Logistics Services',
    'Fire Safety & Emergency Services',
    'Merchant Navy & Maritime',
    'Commercial Pilot',
]

CAREER_DESCRIPTIONS = {
    'AI & Machine Learning': 'Build intelligent systems, neural networks, and AI solutions that transform industries — from self-driving cars to medical diagnosis.',
    'Computer Science & IT': 'Develop software, apps, and cybersecurity systems that power the modern digital world.',
    'Robotics & Automation': 'Design and program robots for manufacturing, healthcare, and space exploration.',
    'Manufacturing & Operations': 'Manage production processes, supply chains, and industrial operations at scale.',
    'People & HR Management': 'Lead organizations, develop talent, and shape the culture of great companies.',
    'Aviation — Pilot': 'Command aircraft and navigate the skies as a certified airline or military pilot.',
    'Aviation — Ground & Cabin Crew': 'Ensure passenger safety and experience as cabin crew or manage airport ground operations.',
    'Musician & Performing Arts': 'Create, perform, and share music and performing arts that moves and inspires the world.',
    'Sports & Athletics': 'Excel in competitive sports, coach athletes, or lead physical wellness programs.',
    'Government Administration': 'Shape public policy and manage government departments to serve citizens effectively.',
    'NGO & Social Service': 'Drive positive social change through non-profit organizations and community development.',
    'Medicine & Healthcare': 'Diagnose, treat, and heal patients as a doctor, surgeon, or medical specialist.',
    'Teaching & Education': 'Inspire the next generation as a teacher, professor, or education leader.',
    'Research Scientist': 'Conduct pioneering research to expand human knowledge in science and technology.',
    'Judiciary & Law': 'Uphold justice as a lawyer, judge, or legal professional in courts of law.',
    'Films & Acting': 'Bring stories to life through acting, directing, and filmmaking.',
    'Content Creation & Media': 'Create compelling digital content, graphics, and journalism that informs and entertains.',
    'Environmental Science & Conservation': 'Protect and restore the natural world as an ecologist or conservation scientist.',
    'Politics & Public Policy': 'Lead communities and shape governance as a political figure or policy advocate.',
    'Writing, Poetry & Literature': 'Express ideas and emotions through the written word as an author or journalist.',
    'Hospitality & Tourism': 'Create exceptional guest experiences in hotels, restaurants, and travel industries.',
    'Civil Service & Administration': 'Serve the public through urban planning, civil engineering, and administrative roles.',
    'Law Enforcement & Security': 'Protect communities as a police officer, detective, or security professional.',
    'Alternative & Holistic Medicine': 'Heal through Ayurveda, homeopathy, and traditional medicine practices.',
    'Business & Entrepreneurship': 'Start businesses, manage finances, and drive economic growth as an entrepreneur.',
    'Defence & Armed Forces': 'Serve the nation with honor in the Army, Navy, or Air Force.',
    'E-Commerce & Digital Business': 'Build and grow digital businesses, online retail, and marketing strategies.',
    'Postal & Logistics Services': 'Manage mail delivery and supply chain services for communities.',
    'Fire Safety & Emergency Services': 'Save lives as a firefighter or emergency services professional.',
    'Merchant Navy & Maritime': 'Navigate the world\'s oceans as a sailor or maritime professional.',
    'Commercial Pilot': 'Fly commercial aircraft and transport passengers across the globe as a licensed pilot.',
}

CAREER_ICONS = {
    'AI & Machine Learning': '🤖',
    'Computer Science & IT': '💻',
    'Robotics & Automation': '🦾',
    'Manufacturing & Operations': '🏭',
    'People & HR Management': '👥',
    'Aviation — Pilot': '✈️',
    'Aviation — Ground & Cabin Crew': '🛫',
    'Musician & Performing Arts': '🎵',
    'Sports & Athletics': '⚽',
    'Government Administration': '🏛️',
    'NGO & Social Service': '🤝',
    'Medicine & Healthcare': '⚕️',
    'Teaching & Education': '📚',
    'Research Scientist': '🔬',
    'Judiciary & Law': '⚖️',
    'Films & Acting': '🎬',
    'Content Creation & Media': '🎨',
    'Environmental Science & Conservation': '🌿',
    'Politics & Public Policy': '🏆',
    'Writing, Poetry & Literature': '✍️',
    'Hospitality & Tourism': '🏨',
    'Civil Service & Administration': '🏗️',
    'Law Enforcement & Security': '🚔',
    'Alternative & Holistic Medicine': '🌺',
    'Business & Entrepreneurship': '💼',
    'Defence & Armed Forces': '🎖️',
    'E-Commerce & Digital Business': '🛒',
    'Postal & Logistics Services': '📮',
    'Fire Safety & Emergency Services': '🚒',
    'Merchant Navy & Maritime': '⚓',
    'Commercial Pilot': '🛩️',
}

# Maps the 7 form skill keys → CSV column names
# Strength of majority-class bias correction at inference (0 = none, 1 = full prior division)
PRIOR_CORRECTION_BETA = 0.7

# Maps the 7 form skill keys → CSV column names
SKILL_COLUMNS = {
    'coding':          'Coding_Skills',
    'communication':   'Communication_Skills',
    'problem_solving': 'Problem_Solving_Skills',
    'teamwork':        'Teamwork_Skills',
    'analytical':      'Analytical_Skills',
    'presentation':    'Presentation_Skills',
    'networking':      'Networking_Skills',
}

# Complete mapping for all 90 CSV careers
CAREER_MAPPING = {
    'AI Researcher': 'AI & Machine Learning',
    'Accountant': 'Business & Entrepreneurship',
    'Acoustics Specialist': 'Research Scientist',
    'Actuary': 'Business & Entrepreneurship',
    'Advertising Manager': 'E-Commerce & Digital Business',
    'Aerospace Engineer': 'Robotics & Automation',
    'Analytical Chemist': 'Research Scientist',
    'Animator': 'Content Creation & Media',
    'Architect': 'Civil Service & Administration',
    'Architectural Technologist': 'Civil Service & Administration',
    'Art Director': 'Content Creation & Media',
    'Art Therapist': 'Medicine & Healthcare',
    'Artist': 'Content Creation & Media',
    'Astronomer': 'Research Scientist',
    'Biochemist': 'Research Scientist',
    'Biologist': 'Research Scientist',
    'Biomedical Engineer': 'Medicine & Healthcare',
    'Biotechnologist': 'Research Scientist',
    'Brand Manager': 'E-Commerce & Digital Business',
    'Chemical Engineer': 'Research Scientist',
    'Chemist': 'Research Scientist',
    'Civil Engineer': 'Civil Service & Administration',
    'Clinical Psychologist': 'Medicine & Healthcare',
    'Composer': 'Musician & Performing Arts',
    'Conductor': 'Musician & Performing Arts',
    'Construction Manager': 'Manufacturing & Operations',
    'Counselor': 'NGO & Social Service',
    'Credit Analyst': 'Business & Entrepreneurship',
    'Curriculum Developer': 'Teaching & Education',
    'Cybersecurity Analyst': 'Computer Science & IT',
    'Data Scientist': 'AI & Machine Learning',
    'Dentist': 'Medicine & Healthcare',
    'Digital Marketing Specialist': 'E-Commerce & Digital Business',
    'Doctor': 'Medicine & Healthcare',
    'Ecologist': 'Environmental Science & Conservation',
    'Education Administrator': 'Teaching & Education',
    'Electrical Engineer': 'Manufacturing & Operations',
    'Entrepreneur': 'Business & Entrepreneurship',
    'Financial Advisor': 'Business & Entrepreneurship',
    'Financial Analyst': 'Business & Entrepreneurship',
    'Financial Controller': 'Business & Entrepreneurship',
    'Fluid Mechanics Engineer': 'Research Scientist',
    'Forensic Psychologist': 'Law Enforcement & Security',
    'Game Developer': 'Computer Science & IT',
    'Geneticist': 'Research Scientist',
    'Graphic Designer': 'Content Creation & Media',
    'Human Resources Specialist': 'People & HR Management',
    'Illustrator': 'Content Creation & Media',
    'Industrial-Organizational Psychologist': 'People & HR Management',
    'Inorganic Chemist': 'Research Scientist',
    'Interior Designer': 'Content Creation & Media',
    'Investment Banker': 'Business & Entrepreneurship',
    'Judge': 'Judiciary & Law',
    'Landscape Architect': 'Environmental Science & Conservation',
    'Lawyer': 'Judiciary & Law',
    'Legal Analyst': 'Judiciary & Law',
    'Legal Consultant': 'Judiciary & Law',
    'Legal Secretary': 'Judiciary & Law',
    'Manager': 'People & HR Management',
    'Market Research Analyst': 'E-Commerce & Digital Business',
    'Marketing Manager': 'E-Commerce & Digital Business',
    'Marketing Specialist': 'E-Commerce & Digital Business',
    'Mechanical Engineer': 'Manufacturing & Operations',
    'Microbiologist': 'Research Scientist',
    'Music Teacher': 'Musician & Performing Arts',
    'Music Therapist': 'Musician & Performing Arts',
    'Musician': 'Musician & Performing Arts',
    'Nuclear Physicist': 'Research Scientist',
    'Nurse': 'Medicine & Healthcare',
    'Organic Chemist': 'Research Scientist',
    'Paralegal': 'Judiciary & Law',
    'Pharmacist': 'Medicine & Healthcare',
    'Physical Chemist': 'Research Scientist',
    'Physician Assistant': 'Medicine & Healthcare',
    'Physicist': 'Research Scientist',
    'Principal': 'Teaching & Education',
    'Psychologist': 'Medicine & Healthcare',
    'Quantum Physicist': 'Research Scientist',
    'Risk Analyst': 'Business & Entrepreneurship',
    'School Counselor': 'Teaching & Education',
    'School Psychologist': 'Medicine & Healthcare',
    'Social Media Manager': 'Content Creation & Media',
    'Software Developer': 'Computer Science & IT',
    'Sound Engineer': 'Musician & Performing Arts',
    'Special Education Teacher': 'Teaching & Education',
    'Surgeon': 'Medicine & Healthcare',
    'Teacher': 'Teaching & Education',
    'Urban Planner': 'Civil Service & Administration',
    'Web Developer': 'Computer Science & IT',
    'Zoologist': 'Environmental Science & Conservation',
}


class CaspaPredictor:
    def __init__(self, data_path):
        self.data_path = data_path
        self.models = {}
        self.accuracies = {}
        self.le_field = LabelEncoder()
        self.le_career = LabelEncoder()
        self.scaler = StandardScaler()
        self.is_trained = False
        self.training_error = None
        self.fields = []
        self.careers = []
        self.category_classes_ = []
        self.class_priors = None  # training frequency of each category (for bias correction)
        self.skill_targets = {}  # {category: {skill_key: avg_level(0-4)}}

    def _get_category(self, csv_career):
        return CAREER_MAPPING.get(csv_career, 'Research Scientist')

    def load_and_preprocess(self):
        df = pd.read_csv(self.data_path)
        self.fields = sorted(df['Field'].unique().tolist())
        self.careers = sorted(df['Career'].unique().tolist())

        # Map raw CSV careers → 31 user categories before training
        # This reduces 90 noisy classes → ~20 meaningful categories
        # and dramatically improves model accuracy and interpretability
        df = df.copy()
        df['Category'] = df['Career'].apply(self._get_category)

        # Data-driven skill targets: average skill level per category (for skill-gap analysis)
        self.skill_targets = {}
        for cat, grp in df.groupby('Category'):
            self.skill_targets[cat] = {
                key: round(float(grp[col].mean()), 1)
                for key, col in SKILL_COLUMNS.items()
            }

        y = df['Category']
        X = df.drop(['Career', 'Category'], axis=1)
        X = X.copy()
        X['Field'] = self.le_field.fit_transform(X['Field'])
        y_enc = self.le_career.fit_transform(y)
        self.category_classes_ = list(self.le_career.classes_)
        # Class priors (training frequency) aligned to category_classes_ — used at
        # inference to down-weight dominant categories so they don't crowd out the rest.
        counts = np.bincount(y_enc, minlength=len(self.category_classes_)).astype(float)
        self.class_priors = counts / counts.sum()
        X_scaled = self.scaler.fit_transform(X)
        return X_scaled, y_enc

    def train(self):
        try:
            X, y = self.load_and_preprocess()
            X_train, X_test, y_train, y_test = train_test_split(
                X, y, test_size=0.2, random_state=42, stratify=y
            )

            model_configs = {
                'Logistic Regression': LogisticRegression(
                    max_iter=1000, random_state=42, solver='lbfgs'
                ),
                'AdaBoost Classifier': AdaBoostClassifier(
                    estimator=DecisionTreeClassifier(max_depth=6),
                    n_estimators=80, random_state=42
                ),
                'Decision Tree': DecisionTreeClassifier(max_depth=12, random_state=42),
                'Gaussian Naïve Bayes': GaussianNB(),
                'Random Forest': RandomForestClassifier(
                    n_estimators=150, random_state=42, n_jobs=-1
                ),
                'SVM Classifier': CalibratedClassifierCV(
                    LinearSVC(max_iter=2000, random_state=42), cv=3
                ),
            }

            for name, model in model_configs.items():
                model.fit(X_train, y_train)
                y_pred = model.predict(X_test)
                from sklearn.metrics import accuracy_score
                acc = accuracy_score(y_test, y_pred)
                self.models[name] = model
                self.accuracies[name] = round(acc * 100, 2)

            self.is_trained = True
        except Exception as e:
            self.training_error = str(e)
            raise
        return self.accuracies

    def _build_input_vector(self, input_dict):
        field = input_dict.get('field', self.fields[0])
        if field in self.le_field.classes_:
            field_enc = int(self.le_field.transform([field])[0])
        else:
            field_enc = 0

        return [
            field_enc,
            float(input_dict.get('gpa', 3.0)),
            int(input_dict.get('extracurricular', 3)),
            int(input_dict.get('internships', 0)),
            int(input_dict.get('projects', 2)),
            int(input_dict.get('leadership', 0)),
            int(input_dict.get('field_courses', 3)),
            int(input_dict.get('research', 0)),
            int(input_dict.get('coding', 2)),
            int(input_dict.get('communication', 2)),
            int(input_dict.get('problem_solving', 2)),
            int(input_dict.get('teamwork', 2)),
            int(input_dict.get('analytical', 2)),
            int(input_dict.get('presentation', 2)),
            int(input_dict.get('networking', 2)),
            int(input_dict.get('certifications', 0)),
        ]

    def predict(self, input_dict):
        if not self.is_trained:
            raise ValueError('Models not trained yet')

        features = self._build_input_vector(input_dict)
        X = np.array(features).reshape(1, -1)
        X_scaled = self.scaler.transform(X)

        # Models predict directly over user category space
        classes = self.category_classes_  # list of user-category strings
        per_model = {}
        all_probs = []

        for name, model in self.models.items():
            proba = model.predict_proba(X_scaled)[0]
            pred_idx = int(np.argmax(proba))
            pred_cat = classes[pred_idx]
            confidence = float(proba[pred_idx])

            per_model[name] = {
                'career': pred_cat,
                'mapped_career': pred_cat,
                'confidence': round(confidence * 100, 1),
                'icon': CAREER_ICONS.get(pred_cat, '🎯'),
            }
            all_probs.append(proba)

        # Ensemble: average probabilities (soft voting)
        avg_probs = np.mean(all_probs, axis=0)

        # Prior correction: the dataset is heavily skewed (Research Scientist + Medicine
        # alone are ~30% of rows) and the features carry weak signal, so the raw ensemble
        # defaults to those two ~80% of the time. Dividing by prior^beta counteracts that
        # majority-class bias so the recommendations reflect the child's actual profile
        # rather than the dataset's composition.
        if self.class_priors is not None:
            beta = PRIOR_CORRECTION_BETA
            adjusted = avg_probs / np.power(self.class_priors + 1e-9, beta)
            avg_probs = adjusted / adjusted.sum()

        category_probs = {classes[i]: float(avg_probs[i]) for i in range(len(classes))}

        sorted_cats = sorted(category_probs.items(), key=lambda x: x[1], reverse=True)

        top_3 = [
            {
                'career': cat,
                'confidence': round(conf * 100, 1),
                'icon': CAREER_ICONS.get(cat, '🎯'),
                'description': CAREER_DESCRIPTIONS.get(cat, ''),
            }
            for cat, conf in sorted_cats[:3]
        ]

        all_categories = [
            {
                'career': cat,
                'confidence': round(conf * 100, 1),
                'icon': CAREER_ICONS.get(cat, '🎯'),
            }
            for cat, conf in sorted_cats
        ]

        top_career = top_3[0]['career'] if top_3 else None

        return {
            'success': True,
            'per_model': per_model,
            'ensemble': {
                'top_3': top_3,
                'all_categories': all_categories,
            },
            'model_accuracies': self.accuracies,
            'skill_targets': self.skill_targets.get(top_career, {}),
        }
