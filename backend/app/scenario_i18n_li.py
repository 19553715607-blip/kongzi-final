"""礼艺场景文案的多语表（10 个情境 × title/setting/options）。

被 `seed_scenario_i18n.py` 导入，结构与 `scenario_i18n_math.py` / `scenario_i18n_shu.py` 一致：

- 顶层键 = 场景中文 `title`（与 `seed_li_scenarios.py` 的 upsert 键一致）
- `title` / `setting` → `{lang: 文本}`
- `options` → `{选项key: {"text": {lang: 文本}}}`，选项 key（A/B/C/D）是身份，不译

约定：只写 en / fr / es / ar 四语；中文原文即基准，不重复收录。
"""
from __future__ import annotations

LI_SCENARIO_I18N: dict[str, dict] = {
    "地铁让座": {
        "title": {
            "en": "A Seat on the Subway",
            "fr": "Une place dans le métro",
            "es": "Un asiento en el metro",
            "ar": "مقعد في المترو",
        },
        "setting": {
            "en": (
                "You have found a rare empty seat on the subway. At the next stop an elderly man "
                "on a cane gets on. Beside you sits a programmer who looks like he has pulled "
                "several all-nighters. You are in a hurry for a job interview."
            ),
            "fr": (
                "Vous avez trouvé une place rare dans le métro. À l'arrêt suivant monte un vieil "
                "homme avec une canne. À côté de vous est assis un développeur qui semble avoir "
                "passé plusieurs nuits blanches. Vous êtes pressé par un entretien d'embauche."
            ),
            "es": (
                "Has encontrado un asiento poco habitual en el metro. En la siguiente parada sube "
                "un anciano con bastón. A tu lado se sienta un programador que parece llevar "
                "varias noches sin dormir. Tienes prisa por una entrevista de trabajo."
            ),
            "ar": (
                "وجدت مقعدًا نادرًا في المترو. في المحطة التالية يصعد رجل مسنّ يتوكأ على عصا، "
                "وإلى جوارك يجلس مبرمج يبدو أنه سهر ليالي متتالية. وأنت في عجلة من أمرك "
                "للذهاب إلى مقابلة عمل."
            ),
        },
        "options": {
            "A": {
                "text": {
                    "en": "Stand up and give the seat to the old man, then keep reviewing interview notes on your feet",
                    "fr": "Vous vous levez et cédez votre place au vieil homme, puis révisez vos notes d'entretien debout",
                    "es": "Te levantas y cedes el asiento al anciano, y sigues repasando tus apuntes de la entrevista de pie",
                    "ar": "تقف وتفسح المقعد للرجل المسنّ، وتواصل مراجعة ملاحظات المقابلة واقفًا",
                }
            },
            "B": {
                "text": {
                    "en": "Pretend not to notice and keep staring at your phone",
                    "fr": "Vous faites semblant de ne rien voir et continuez à regarder votre téléphone",
                    "es": "Finges no darte cuenta y sigues mirando el móvil",
                    "ar": "تتظاهر بأنك لم ترَ شيئًا وتواصل النظر إلى هاتفك",
                }
            },
            "C": {
                "text": {
                    "en": "Nudge the programmer with your elbow, hinting that he should give up his seat",
                    "fr": "Vous poussez discrètement le développeur du coude pour lui suggérer de céder sa place",
                    "es": "Codeas al programador con el codo para insinuarle que ceda su asiento",
                    "ar": "تلمس ذراع المبرمج برفق لتلمّح إليه بأن يفسح مقعده",
                }
            },
            "D": {
                "text": {
                    "en": "Stand up yourself, smile at the programmer and say: 'Shall we both stand?'",
                    "fr": "Vous vous levez et, avec un sourire au développeur : « On se lève tous les deux ? »",
                    "es": "Te levantas y, sonriendo al programador: «¿Nos ponemos de pie los dos?»",
                    "ar": "تقف بنفسك وتبتسم للمبرمج قائلًا: «هل نقف نحن الاثنان؟»",
                }
            },
        },
    },
    "聚餐听老板": {
        "title": {
            "en": "The Boss's Story at Dinner",
            "fr": "Le récit du patron au dîner",
            "es": "La historia del jefe en la cena",
            "ar": "حكاية المدير على العشاء",
        },
        "setting": {
            "en": (
                "At a team dinner the boss is in high spirits, recounting how he started the "
                "company. He has been talking for 25 minutes. One by one, colleagues have lowered "
                "their heads to their food. You happen to sit opposite him, and he glances at you "
                "now and then."
            ),
            "fr": (
                "Au dîner d'équipe, le patron, de bonne humeur, raconte la création de "
                "l'entreprise. Cela fait vingt-cinq minutes qu'il parle. Les collègues baissent "
                "tour à tour la tête vers leur assiette. Vous êtes justement en face de lui, et il "
                "vous regarde de temps à autre."
            ),
            "es": (
                "En la cena de equipo el jefe, animado, cuenta cómo fundó la empresa. Lleva "
                "veinticinco minutos hablando. Los colegas van bajando la cabeza hacia el plato. "
                "Tú estás justo enfrente de él y te mira de vez en cuando."
            ),
            "ar": (
                "في عشاء الفريق، المدير في مزاج جيد يحكي كيف أسّس الشركة، وقد مضى خمس وعشرون "
                "دقيقة وهو يتحدث. الزملاء يطأطئون رؤوسهم إلى أطباقهم واحدًا بعد الآخر. وأنت "
                "تجلس قبالتَه، وينظر إليك من حين إلى آخر."
            ),
        },
        "options": {
            "A": {
                "text": {
                    "en": "Nod repeatedly: 'So inspiring!' 'That's real vision!'",
                    "fr": "Hocher la tête sans arrêt : « Vraiment inspirant ! » « Ça, c'est de la vision ! »",
                    "es": "Asentir una y otra vez: «¡Muy inspirador!» «¡Eso es visión!»",
                    "ar": "تومئ برأسك مرارًا: «ملهم حقًا!» «هذه هي الرؤية!»",
                }
            },
            "B": {
                "text": {
                    "en": "Listen attentively, nod now and then, say nothing",
                    "fr": "Écouter attentivement, hocher la tête de temps en temps, sans rien dire",
                    "es": "Escuchar con atención, asentir de vez en cuando, sin decir nada",
                    "ar": "تنصت بانتباه، وتومئ أحيانًا، دون أن تتكلم",
                }
            },
            "C": {
                "text": {
                    "en": "Ask him about a point you genuinely find puzzling",
                    "fr": "Lui poser une question sur un point qui vous intrigue réellement",
                    "es": "Preguntarle por algún punto que de verdad te desconcierta",
                    "ar": "تسأله عن نقطة تحيّرك فعلًا",
                }
            },
            "D": {
                "text": {
                    "en": "Pretend to take a call and step out for five minutes",
                    "fr": "Faire semblant de prendre un appel et sortir cinq minutes",
                    "es": "Fingir recibir una llamada y salir cinco minutos",
                    "ar": "تتظاهر باستقبال مكالمة وتخرج خمس دقائق",
                }
            },
        },
    },
    "同事邀功": {
        "title": {
            "en": "A Colleague Takes the Credit",
            "fr": "Un collègue s'attribue le mérite",
            "es": "Un colega se lleva el mérito",
            "ar": "زميل ينسب الفضل لنفسه",
        },
        "setting": {
            "en": (
                "The project has shipped. At the review meeting your colleague describes the core "
                "part you built as 'something we did together' — yet spends 80% of the time on his "
                "own part. Now it's your turn."
            ),
            "fr": (
                "Le projet est livré. À la réunion de bilan, votre collègue présente le cœur du "
                "travail que vous avez fait comme « quelque chose que nous avons fait ensemble », "
                "tout en consacrant 80 % du temps à sa propre partie. C'est votre tour."
            ),
            "es": (
                "El proyecto se ha entregado. En la reunión de balance, tu colega presenta la parte "
                "central que hiciste tú como «algo que hicimos juntos», pero dedica el 80 % del "
                "tiempo a su parte. Ahora es tu turno."
            ),
            "ar": (
                "تم تسليم المشروع. في اجتماع العرض يصف زميلك الجزء الجوهري الذي أنجزته بأنه «عمل "
                "قمنا به معًا»، لكنه يستغرق 80% من الوقت في الحديث عن جزئه هو. وجاء دورك."
            ),
        },
        "options": {
            "A": {
                "text": {
                    "en": "Stay breezy: 'Nothing to add from me.'",
                    "fr": "Rester léger : « Rien à ajouter de mon côté. »",
                    "es": "Quedarte ligero: «No tengo nada que añadir.»",
                    "ar": "تبدو هادئًا: «ليس لدي ما أضيف»",
                }
            },
            "B": {
                "text": {
                    "en": "Add the facts: 'Here's how that part was actually implemented…' (without naming anyone)",
                    "fr": "Compléter par les faits : « Voici comment cette partie a été réalisée… » (sans nommer personne)",
                    "es": "Añadir los hechos: «Así se implementó esa parte…» (sin nombrar a nadie)",
                    "ar": "تضيف الوقائع: «هكذا نُفِّذ هذا الجزء فعليًا…» (دون تسمية أحد)",
                }
            },
            "C": {
                "text": {
                    "en": "Say it outright: 'I built that part.'",
                    "fr": "Le dire franchement : « C'est moi qui ai fait cette partie. »",
                    "es": "Decirlo sin rodeos: «Esa parte la hice yo.»",
                    "ar": "تقولها صراحة: «هذا الجزء أنجزته أنا»",
                }
            },
            "D": {
                "text": {
                    "en": "Have a private 'word' with the colleague after the meeting",
                    "fr": "Avoir une « discussion » en privé avec le collègue après la réunion",
                    "es": "Tener una «conversación» en privado con el colega después de la reunión",
                    "ar": "تجري «حديثًا» خاصًا مع الزميل بعد الاجتماع",
                }
            },
        },
    },
    "失恋朋友的质问": {
        "title": {
            "en": "A Friend's Blunt Question",
            "fr": "La question directe d'une amie",
            "es": "La pregunta directa de una amiga",
            "ar": "سؤال صديقة بعد فراق",
        },
        "setting": {
            "en": (
                "A close friend has been pouring her heart out to you for an hour after a breakup. "
                "Suddenly she looks up: 'Didn't you always think he was unreliable? Tell me the "
                "truth.'"
            ),
            "fr": (
                "Une amie proche vous confie sa rupture depuis une heure. Soudain, elle lève les "
                "yeux : « Tu as toujours pensé qu'il n'était pas fiable, non ? Dis-moi la vérité. »"
            ),
            "es": (
                "Una amiga íntima lleva una hora desahogándose contigo tras una ruptura. De pronto "
                "levanta la vista: «¿Tú siempre pensaste que él no era de fiar? Dime la verdad.»"
            ),
            "ar": (
                "صديقة مقرّبة تفضي إليك بما في قلبها منذ ساعة بعد فراق. فجأة ترفع رأسها: «ألم "
                "تكوني ترين دائمًا أنه غير موثوق؟ قولي لي الحقيقة.»"
            ),
        },
        "options": {
            "A": {
                "text": {
                    "en": "'Right, I never rated him — a cad like that doesn't deserve you.'",
                    "fr": "« Oui, je ne l'ai jamais trouvé à la hauteur : un goujat comme lui ne te méritait pas. »",
                    "es": "«Sí, nunca me gustó: un tipo así no te merecía.»",
                    "ar": "«نعم، لم أرَ فيه خيرًا قط؛ رجل كهذا لا يستحقك»",
                }
            },
            "B": {
                "text": {
                    "en": "'I don't know him well enough to judge.'",
                    "fr": "« Je le connais trop peu pour juger. »",
                    "es": "«No lo conozco lo suficiente para juzgar.»",
                    "ar": "«لا أعرفه بما يكفي لأحكم عليه»",
                }
            },
            "C": {
                "text": {
                    "en": "'The him you saw was real, and so was the one I saw.'",
                    "fr": "« Celui que tu as vu était réel, et celui que j'ai vu l'était aussi. »",
                    "es": "«El él que tú viste era real, y el que yo vi también.»",
                    "ar": "«الذي رأيتِه كان حقيقيًا، والذي رأيته أنا كان حقيقيًا أيضًا»",
                }
            },
            "D": {
                "text": {
                    "en": "'I won't judge him for now. What hurts the most right now?'",
                    "fr": "« Je ne le jugerai pas pour l'instant. Qu'est-ce qui te fait le plus mal, là, maintenant ? »",
                    "es": "«No lo voy a juzgar ahora. ¿Qué es lo que más te duele en este momento?»",
                    "ar": "«لن أحكم عليه الآن. ما أكثر ما يؤلمك في هذه اللحظة؟»",
                }
            },
        },
    },
    "朋友炫富": {
        "title": {
            "en": "A Friend Shows Off",
            "fr": "Un ami qui s'affiche",
            "es": "Un amigo que presume",
            "ar": "صديق يتفاخر",
        },
        "setting": {
            "en": (
                "At a reunion of classmates you haven't seen in three years, one of them opens "
                "with his new car and his newly bought flat. The others are starting to feel "
                "awkward."
            ),
            "fr": (
                "À des retrouvailles avec des camarades que vous n'avez pas vus depuis trois ans, "
                "l'un d'eux commence par sa nouvelle voiture et son appartement fraîchement "
                "acheté. Les autres commencent à être mal à l'aise."
            ),
            "es": (
                "En un reencuentro con compañeros a los que no veías desde hace tres años, uno "
                "empieza hablando de su coche nuevo y del piso que acaba de comprar. Los demás "
                "empiezan a sentirse incómodos."
            ),
            "ar": (
                "في لقاء مع زملاء لم ترهم منذ ثلاث سنوات، يبدأ أحدهم الحديث عن سيارته الجديدة "
                "وشقته التي اشتراها للتوّ، ويبدأ الآخرون بالشعور بالحرج."
            ),
        },
        "options": {
            "A": {
                "text": {
                    "en": "Play along admiringly: 'Amazing, you're really something.'",
                    "fr": "Jouer le jeu avec admiration : « C'est formidable, tu es vraiment fort. »",
                    "es": "Seguirle el juego con admiración: «Qué grande, eres increíble.»",
                    "ar": "تشاركه الإعجاب: «رائع حقًا، أنت مذهل»",
                }
            },
            "B": {
                "text": {
                    "en": "Change the subject: 'By the way, do you still play basketball?'",
                    "fr": "Changer de sujet : « Au fait, tu joues encore au basket ? »",
                    "es": "Cambiar de tema: «Por cierto, ¿sigues jugando al baloncesto?»",
                    "ar": "تغيّر الموضوع: «بالمناسبة، هل ما زلت تلعب كرة السلة؟»",
                }
            },
            "C": {
                "text": {
                    "en": "Answer coldly with 'Mm', then keep your head down and eat",
                    "fr": "Répondre froidement « Mouais », puis se concentrer sur son assiette",
                    "es": "Responder con frialdad «Ya», y luego centrarte en el plato",
                    "ar": "ترد ببرود «حسنًا»، ثم تنكبّ على طعامك",
                }
            },
            "D": {
                "text": {
                    "en": "Tease him with a smile: 'All right, all right — we get it, no need for every detail.'",
                    "fr": "Le taquiner en souriant : « Ça va, ça va, on a compris, pas besoin de tous les détails. »",
                    "es": "Bromear con una sonrisa: «Vale, vale, ya lo pillamos, no hace falta tanto detalle.»",
                    "ar": "تمازحه بابتسامة: «كفى كفى، فهمنا، لا حاجة لكل التفاصيل»",
                }
            },
        },
    },
    "父母的旧错": {
        "title": {
            "en": "An Old Family Wound",
            "fr": "Une vieille blessure familiale",
            "es": "Una vieja herida familiar",
            "ar": "جرح عائلي قديم",
        },
        "setting": {
            "en": (
                "You are 30 and home for the New Year. Your mother brings up again the time you "
                "did badly in the college entrance exam: 'It's all because you wouldn't listen "
                "back then.' Relatives are listening."
            ),
            "fr": (
                "Vous avez 30 ans et rentrez pour le Nouvel An. Votre mère ressort l'épisode de "
                "votre échec au concours d'entrée : « Tout ça parce que tu n'écoutais rien à "
                "l'époque. » Les autres membres de la famille écoutent."
            ),
            "es": (
                "Tienes 30 años y vuelves a casa por Año Nuevo. Tu madre saca otra vez lo mal que "
                "te fue en el examen de acceso a la universidad: «Todo por no hacerme caso "
                "entonces.» Los demás familiares escuchan."
            ),
            "ar": (
                "عمرك ثلاثون عامًا وقد عدت إلى البيت في رأس السنة. تعود أمك إلى ذكرى ضعف نتيجتك "
                "في امتحان الجامعة: «كل هذا لأنك لم تسمع كلامي حينها». والأقارب يستمعون."
            ),
        },
        "options": {
            "A": {
                "text": {
                    "en": "'Mum, it's been twelve years — can we drop it?' — push back directly",
                    "fr": "« Maman, ça fait douze ans, on peut passer à autre chose ? » — répliquer directement",
                    "es": "«Mamá, han pasado doce años, ¿podemos dejarlo?» — responder de frente",
                    "ar": "«أمي، مضت اثنتا عشرة سنة، ألا يمكن أن نترك هذا؟» — تردّ مباشرة",
                }
            },
            "B": {
                "text": {
                    "en": "Smile, let her finish, then steer the conversation elsewhere",
                    "fr": "Sourire, la laisser finir, puis détourner la conversation",
                    "es": "Sonreír, dejarla terminar y luego desviar la conversación",
                    "ar": "تبتسم وتستمع حتى تنتهي ثم تحوّل الحديث",
                }
            },
            "C": {
                "text": {
                    "en": "Answer seriously: 'Things were hard for you back then. I understand now.'",
                    "fr": "Répondre sérieusement : « Vous n'aviez pas la vie facile à l'époque. Je le comprends maintenant. »",
                    "es": "Responder con seriedad: «Lo pasaste mal entonces. Ahora lo entiendo.»",
                    "ar": "ترد بجدية: «كانت الأمور صعبة عليك حينها، وأنا أفهم ذلك الآن»",
                }
            },
            "D": {
                "text": {
                    "en": "Find an excuse to help in the kitchen and leave the table",
                    "fr": "Trouver un prétexte pour aller aider à la cuisine et quitter la table",
                    "es": "Buscar una excusa para ayudar en la cocina y levantarte de la mesa",
                    "ar": "تختلق عذرًا لتساعد في المطبخ وتغادر المائدة",
                }
            },
        },
    },
    "父母过度操心": {
        "title": {
            "en": "A Mother Who Worries Too Much",
            "fr": "Une mère trop inquiète",
            "es": "Una madre que se preocupa demasiado",
            "ar": "أم تفرط في القلق",
        },
        "setting": {
            "en": (
                "You are 25 and rent on your own. Your mother calls three times a week, each time "
                "repeating 'remember your medicine', 'don't stay up late', 'seeing anyone yet?'. "
                "This week you are unusually busy."
            ),
            "fr": (
                "Vous avez 25 ans et vivez seul en location. Votre mère appelle trois fois par "
                "semaine, répétant chaque fois « pense à tes médicaments », « ne veille pas trop », "
                "« tu as rencontré quelqu'un ? ». Cette semaine, vous êtes particulièrement occupé."
            ),
            "es": (
                "Tienes 25 años y vives de alquiler. Tu madre llama tres veces por semana y repite "
                "siempre «acuérdate de la medicina», «no te acuestes tarde», «¿ya tienes pareja?». "
                "Esta semana estás muy ocupado."
            ),
            "ar": (
                "عمرك خمسة وعشرون عامًا وتعيش في شقة مستأجرة. تتصل بك أمك ثلاث مرات أسبوعيًا "
                "وتكرر في كل مرة: «لا تنسَ دواءك»، «لا تسهر»، «هل وجدت شريكة بعد؟». وهذا الأسبوع "
                "أنت مشغول جدًا."
            ),
        },
        "options": {
            "A": {
                "text": {
                    "en": "Don't pick up; text back 'in a meeting'",
                    "fr": "Ne pas décrocher ; répondre par SMS « en réunion »",
                    "es": "No contestar; responder por mensaje «estoy en una reunión»",
                    "ar": "لا ترد، وترسل رسالة: «في اجتماع»",
                }
            },
            "B": {
                "text": {
                    "en": "Pick up and get it over with: 'Yes, yes, got it.'",
                    "fr": "Décrocher et expédier : « Oui, oui, c'est noté. »",
                    "es": "Contestar y despachar rápido: «Sí, sí, enterado.»",
                    "ar": "ترد وتنهي بسرعة: «حسنًا حسنًا، فهمت»",
                }
            },
            "C": {
                "text": {
                    "en": "Set a fixed long call every Sunday and report on your life proactively",
                    "fr": "Instaurer un long appel fixe chaque dimanche et raconter votre vie de vous-même",
                    "es": "Fijar una llamada larga cada domingo y contarle tu vida por iniciativa propia",
                    "ar": "تحدد مكالمة طويلة ثابتة كل أحد وتخبرها بأخبارك من تلقاء نفسك",
                }
            },
            "D": {
                "text": {
                    "en": "Talk it through honestly: 'Calling this often leaves me a bit drained.'",
                    "fr": "En parler franchement : « Appeler aussi souvent me fatigue un peu. »",
                    "es": "Hablar claro con ella: «Llamar tan a menudo me cansa un poco.»",
                    "ar": "تتحدث معها بصراحة: «هذه المكالمات الكثيرة ترهقني قليلًا»",
                }
            },
        },
    },
    "同学考试求看": {
        "title": {
            "en": "A Classmate Wants to Copy",
            "fr": "Un camarade veut copier",
            "es": "Un compañero quiere copiar",
            "ar": "زميل يطلب الغش",
        },
        "setting": {
            "en": (
                "Final exam. The invigilator is a new teacher and clearly lax. The classmate in "
                "front turns around and silently signals: 'Just let me see.' He is a good friend."
            ),
            "fr": (
                "Examen final. Le surveillant est un jeune professeur manifestement peu strict. Le "
                "camarade devant vous se retourne et fait signe en silence : « Laisse-moi jeter un "
                "œil. » C'est un bon ami."
            ),
            "es": (
                "Examen final. El vigilante es un profesor nuevo y claramente poco estricto. El "
                "compañero de delante se gira y te hace señas en silencio: «Déjame ver.» Es un buen "
                "amigo."
            ),
            "ar": (
                "امتحان نهائي، والمراقب أستاذ جديد متساهل بوضوح. يستدير زميلك في الصف الأمامي "
                "ويشير إليك بصمت: «دعني ألقي نظرة». وهو صديق مقرّب."
            ),
        },
        "options": {
            "A": {
                "text": {
                    "en": "Pretend not to see and carry on with your paper",
                    "fr": "Faire semblant de ne pas voir et continuer votre copie",
                    "es": "Fingir no verlo y seguir con tu examen",
                    "ar": "تتظاهر بأنك لم ترَ وتواصل حلّ ورقتك",
                }
            },
            "B": {
                "text": {
                    "en": "Tilt your paper towards him",
                    "fr": "Incliner votre copie vers lui",
                    "es": "Inclinar tu hoja hacia él",
                    "ar": "تُميل ورقتك نحوه ليراها",
                }
            },
            "C": {
                "text": {
                    "en": "After the exam, offer to walk him through the material",
                    "fr": "Après l'examen, proposer de lui réexpliquer le cours",
                    "es": "Después del examen, ofrecerte a explicarle la materia",
                    "ar": "بعد الامتحان تعرض عليه أن تشرح له المادة",
                }
            },
            "D": {
                "text": {
                    "en": "Raise your hand and call the teacher over",
                    "fr": "Lever la main et appeler le surveillant",
                    "es": "Levantar la mano y llamar al vigilante",
                    "ar": "ترفع يدك وتستدعي المراقب",
                }
            },
        },
    },
    "群里被攻击": {
        "title": {
            "en": "Attacked in a Group Chat",
            "fr": "Attaqué dans un groupe",
            "es": "Atacado en un grupo",
            "ar": "هجوم في مجموعة",
        },
        "setting": {
            "en": (
                "You shared an article in a 200-person work group. Someone you barely know "
                "immediately replies 'You believe this stuff? How shallow', and @-mentions you."
            ),
            "fr": (
                "Vous avez partagé un article dans un groupe de travail de 200 personnes. Une "
                "connaissance lointaine répond aussitôt : « Tu crois à ce genre de choses ? C'est "
                "bien superficiel », et vous mentionne."
            ),
            "es": (
                "Has compartido un artículo en un grupo de trabajo de 200 personas. Alguien a quien "
                "apenas conoces responde al instante: «¿Te crees estas cosas? Qué superficial», y "
                "te menciona."
            ),
            "ar": (
                "شاركت مقالًا في مجموعة عمل تضم مئتي شخص. فورًا يردّ أحد معارفك البعيدين: «أتؤمن "
                "بهذا الكلام؟ هذا سطحي جدًا»، ويشير إليك."
            ),
        },
        "options": {
            "A": {
                "text": {
                    "en": "Hit back at once: 'You're the shallow one.'",
                    "fr": "Répliquer aussitôt : « C'est toi qui es superficiel. »",
                    "es": "Contraatacar al momento: «El superficial eres tú.»",
                    "ar": "ترد فورًا: «بل أنت السطحي»",
                }
            },
            "B": {
                "text": {
                    "en": "Message him privately: 'Which part exactly do you take issue with? I'd like to learn.'",
                    "fr": "Lui écrire en privé : « Qu'est-ce qui te pose problème exactement ? J'aimerais comprendre. »",
                    "es": "Escribirle en privado: «¿Qué parte te parece mal exactamente? Me gustaría entender.»",
                    "ar": "تراسله على الخاص: «ما الذي تراه خطأ تحديدًا؟ أودّ أن أستفيد من رأيك»",
                }
            },
            "C": {
                "text": {
                    "en": "Reply in the group: 'Would you be willing to spell out your view?'",
                    "fr": "Répondre dans le groupe : « Voudriez-vous développer votre point de vue ? »",
                    "es": "Responder en el grupo: «¿Te importaría explicar tu punto de vista?»",
                    "ar": "ترد في المجموعة: «هل تتكرم بشرح رأيك المخالف؟»",
                }
            },
            "D": {
                "text": {
                    "en": "Say nothing and quietly leave the group",
                    "fr": "Ne rien dire et quitter discrètement le groupe",
                    "es": "No decir nada y salir del grupo discretamente",
                    "ar": "لا ترد وتغادر المجموعة بهدوء",
                }
            },
        },
    },
    "网约车的等待": {
        "title": {
            "en": "The Late Ride",
            "fr": "La course en retard",
            "es": "El viaje tardío",
            "ar": "رحلة متأخرة",
        },
        "setting": {
            "en": (
                "The ride you booked took 20 minutes to arrive. The driver starts complaining at "
                "once: 'Traffic is terrible, nothing has gone right today.' You are rushing to a "
                "meeting."
            ),
            "fr": (
                "La voiture réservée a mis vingt minutes à arriver. Le chauffeur se plaint d'emblée : "
                "« Les routes sont bouchées, rien ne va aujourd'hui. » Vous courez à une réunion."
            ),
            "es": (
                "El coche que pediste tardó veinte minutos en llegar. El conductor se queja nada más "
                "subir: «Hay un atasco terrible, hoy nada sale bien.» Tienes prisa por una reunión."
            ),
            "ar": (
                "تأخرت السيارة التي طلبتها عشرين دقيقة. يبدأ السائق بالشكوى فورًا: «الطرق مزدحمة "
                "جدًا، لا شيء يسير على ما يرام اليوم». وأنت في عجلة للوصول إلى اجتماع."
            ),
        },
        "options": {
            "A": {
                "text": {
                    "en": "Coldly: 'I'm in a hurry — please drive faster.'",
                    "fr": "Froidement : « Je suis pressé, accélérez, s'il vous plaît. »",
                    "es": "Con frialdad: «Tengo prisa, por favor vaya más rápido.»",
                    "ar": "ببرود: «أنا مستعجل، أسرع من فضلك»",
                }
            },
            "B": {
                "text": {
                    "en": "Give a perfunctory 'Mm-hm' and look at your phone",
                    "fr": "Lâcher un « Mouais » et regarder votre téléphone",
                    "es": "Soltar un «Ya» y mirar el móvil",
                    "ar": "ترد بلا اهتمام «أها» ثم تنظر إلى هاتفك",
                }
            },
            "C": {
                "text": {
                    "en": "Answer sincerely: 'True — it's probably the day before the holiday.'",
                    "fr": "Répondre sincèrement : « C'est vrai, on est sans doute la veille d'un jour férié. »",
                    "es": "Responder con sinceridad: «Es cierto, quizá sea víspera de festivo.»",
                    "ar": "ترد بصدق: «صحيح، ربما لأن غدًا عطلة»",
                }
            },
            "D": {
                "text": {
                    "en": "Advise him: 'You should plan your route in advance.'",
                    "fr": "Lui conseiller : « Vous devriez planifier votre itinéraire à l'avance. »",
                    "es": "Aconsejarle: «Debería planificar la ruta con antelación.»",
                    "ar": "تنصحه: «كان عليك تخطيط الطريق مسبقًا»",
                }
            },
        },
    },
}
