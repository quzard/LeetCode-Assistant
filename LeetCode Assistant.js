// ==UserScript==
// @name         LeetCode Assistant
// @namespace    http://tampermonkey.net/
// @version      1.0.10
// @require      https://cdn.bootcss.com/jquery/3.4.1/jquery.js
// @require      https://greasyfork.org/scripts/422854-bubble-message.js
// @require      https://greasyfork.org/scripts/432416-statement-parser.js
// @match        https://leetcode.cn/problemss/*
// @match        https://leetcode.cn/problemset/*
// @match        *://leetcode.cn/company/*/*
// @match        *://leetcode.cn/problem-list/*/*
// @match        *://leetcode.cn/tag/*/*
// @grant        GM_setValue
// @grant        GM_getValue
// ==/UserScript==
// noinspection JSUnresolvedFunction

(function() {
    const __VERSION__ = '1.0.9';
    let executing = false;
    const bm = new BubbleMessage();
    bm.config.width = 400;

    const config = {
        recommendVisible: false,
        autoAdjustView: true,
        __hideAnsweredQuestion: false,
        __hideEasyQuestion: false,
        __hideMiddleQuestion: false,
        __hideHardQuestion: false,

        __hideCollectionAnsweredQuestion: false,
        __hideEasy: false,
        __hideMiddle: false,
        __hideHard: false,
        __supportLanguage: ['Java', 'C++', 'Python3', 'JavaScript'],
    };

    const Basic = {
        updateData: function(obj) {
            let data = GM_getValue('data');
            if (!obj) {
                // 初始化调用
                if (!data) {
                    // 未初始化
                    data = {};
                    Object.assign(data, config);
                    GM_setValue('data', data);
                } else {
                    // 已初始化，检查是否存在更新脚本后未添加的值
                    let isModified = false;
                    for (let key in config) {
                        if (data[key] === undefined) {
                            isModified = true;
                            data[key] = config[key];
                        }
                    }
                    // 双下划綫开头的属性删除掉，因为不需要保存
                    for (let key in data) {
                        if (key.startsWith('__')) {
                            isModified = true;
                            delete data[key];
                        }
                    }
                    if (isModified)
                        GM_setValue('data', data);
                    Object.assign(config, data);
                }
            } else {
                // 更新调用
                Object.assign(config, obj);
                Object.assign(data, config);
                GM_setValue('data', data);
            }
        },
        listenHistoryState: function() {
            const _historyWrap = function(type) {
                const orig = history[type];
                const e = new Event(type);
                return function() {
                    const rv = orig.apply(this, arguments);
                    e.arguments = arguments;
                    window.dispatchEvent(e);
                    return rv;
                };
            };
            history.pushState = _historyWrap('pushState');
            window.addEventListener('pushState', () => {
                if (!executing) {
                    executing = true;
                    main();
                }
            });
        },
        observeChildList: function(node, callback) {
            let observer = new MutationObserver(function(mutations) {
                mutations.forEach((mutation) => {
                    if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                        callback([...mutation.addedNodes]);
                    }
                });
            });
            observer.observe(node, { childList: true });
        },
        executeUtil: function(task, cond, args, thisArg, timeout) {
            args = args || [];
            timeout = timeout || 250;
            if (cond()) {
                task.apply(thisArg, args);
            } else {
                setTimeout(() => {
                    Basic.executeUtil(task, cond, args, thisArg, timeout);
                }, timeout);
            }
        }
    };

    const Switch = {
        setSwitch: function(container, id_, onchange, text, defaultChecked) {
            if (defaultChecked === undefined)
                defaultChecked = true;
            container.style = 'display: inline-flex; align-items: center; margin-left: 10px;';
            let switchCheckbox = document.createElement('input');
            switchCheckbox.type = 'checkbox';
            switchCheckbox.checked = defaultChecked;
            switchCheckbox.setAttribute('id', id_);
            switchCheckbox.addEventListener('change', onchange);
            let switchLabel = document.createElement('label');
            switchLabel.setAttribute('for', id_);
            switchLabel.innerText = text;
            switchLabel.style.marginLeft = '5px';
            switchLabel.setAttribute('style', 'margin-left: 5px; cursor: default;')
            container.appendChild(switchCheckbox);
            container.appendChild(switchLabel);
        },
        switchVisible: function switchVisible(nodes, visible, defaultDisplay) {
            defaultDisplay = defaultDisplay || '';
            if (visible) {
                nodes.forEach(node => node.style.display = defaultDisplay);
            } else {
                nodes.forEach(node => node.style.display = 'none');
            }
        },
        switchRecommendVisible: function() {
            let nodes = [];
            let target = document.querySelector('.border-divider-border-2');
            while (target) {
                nodes.push(target);
                target = target.previousElementSibling;
            }
            let sidebar = document.querySelector('.col-span-4:nth-child(2)');
            target = sidebar.querySelector('.space-y-4:nth-child(2)');
            while (target) {
                nodes.push(target);
                target = target.nextElementSibling;
            }
            Switch.switchVisible(nodes, config.recommendVisible);
            Basic.observeChildList(sidebar, (nodes) => {
                Switch.switchVisible(nodes, config.recommendVisible);
            });
        },
        switchAnsweredQuestionVisible: function() {
            let Count = 0;
            let visible = !config.__hideAnsweredQuestion;
            let rowGroup = document.querySelector('[role=rowgroup]');
            let nodes = [...rowGroup.querySelectorAll('[role=row]')];
            let matchPage = location.href.match(/\?page=(\d+)/);
            if (!matchPage || parseInt(matchPage[1]) === 1)
                nodes = nodes.slice(1);
            nodes = nodes.filter(node => node.querySelector('svg.text-green-s'));
            for (let node of nodes){
                if (visible) {
                    if (config.__hideEasyQuestion && node.children[node.children["length"]-2].children[0].className === "text-olive dark:text-dark-olive"){
                        continue
                    }
                    if (config.__hideMiddleQuestion && node.children[node.children["length"]-2].children[0].className === "text-yellow dark:text-dark-yellow"){
                        continue
                    }
                    if (config.__hideMiddleQuestion && node.children[node.children["length"]-2].children[0].className === "text-pink dark:text-dark-pink"){
                        continue
                    }
                    node.style.display = 'flex';
                    Count++;
                } else {
                    node.style.display = 'none';
                }
            }
            if (Count != 0){
                bm.message({
                    type: 'warning',
                    message: `总共 ${Count} 道已解决问题`,
                    duration: 10,
                });
            }
        },
        switchEasyQuestionVisible: function() {
            let Count = 0;
            let visible = !config.__hideEasyQuestion;
            let rowGroup = document.querySelector('[role=rowgroup]');
            let nodes = [...rowGroup.querySelectorAll('[role=row]')];
            let matchPage = location.href.match(/\?page=(\d+)/);
            if (!matchPage || parseInt(matchPage[1]) === 1)
                nodes = nodes.slice(1);
            nodes = nodes.filter(node => node.querySelector('.text-olive'));
            for (let node of nodes){
                if (node != null) {
                    if (visible && !(config.__hideAnsweredQuestion && node.children[0].children[0].classList[2] === "text-green-s")) {
                        Count++;
                        node.style.display = 'flex';
                    } else {
                        node.style.display = 'none';
                    }
                }
            }
            if (Count != 0){
                bm.message({
                    type: 'warning',
                    message: `总共 ${Count} 道简单问题`,
                    duration: 10,
                });
            }
        },
        switchMiddleQuestionVisible: function() {
            let Count = 0;
            let visible = !config.__hideMiddleQuestion;
            let rowGroup = document.querySelector('[role=rowgroup]');
            let nodes = [...rowGroup.querySelectorAll('[role=row]')];
            let matchPage = location.href.match(/\?page=(\d+)/);
            if (!matchPage || parseInt(matchPage[1]) === 1)
                nodes = nodes.slice(1);
            nodes = nodes.filter(node => node.querySelector('.text-yellow'));
            for (let node of nodes){
                if (node != null) {
                    if (visible && !(config.__hideAnsweredQuestion && node.children[0].children[0].classList[2] === "text-green-s")) {
                        Count++;
                        node.style.display = 'flex';
                    } else {
                        node.style.display = 'none';
                    }
                }
            }
            if (Count != 0){
                bm.message({
                    type: 'warning',
                    message: `总共 ${Count} 道中等问题`,
                    duration: 10,
                });
            }
        },
        switchHardQuestionVisible: function() {
            let Count = 0;
            let visible = !config.__hideHardQuestion;
            let rowGroup = document.querySelector('[role=rowgroup]');
            let nodes = [...rowGroup.querySelectorAll('[role=row]')];
            let matchPage = location.href.match(/\?page=(\d+)/);
            if (!matchPage || parseInt(matchPage[1]) === 1)
                nodes = nodes.slice(1);
            nodes = nodes.filter(node => node.querySelector('.text-pink'));
            for (let node of nodes){
                if (node != null) {
                    if (visible && !(config.__hideAnsweredQuestion && node.children[0].children[0].classList[2] === "text-green-s")) {
                        Count++;
                        node.style.display = 'flex';
                    } else {
                        node.style.display = 'none';
                    }
                }
            }
            if (Count != 0){
                bm.message({
                    type: 'warning',
                    message: `总共 ${Count} 道困难问题`,
                    duration: 10,
                });
            }
        },






        switchCollectionAnsweredQuestionVisible: function() {
            let Count = 0;
            visible = !config.__hideCollectionAnsweredQuestion;
            let nodes = [...document.querySelectorAll('.ant-table-tbody>tr')];
            nodes = nodes.filter(node => {
                let svg = node.querySelector('svg');
                return svg.getAttribute('color').includes('success');
            });
            for (let node of nodes){
                if (visible) {
                    if (config.__hideEasy && node.children[3].children[0].className === "css-1h8d1g1-Text esow0ct0"){
                        continue
                    }
                    if (config.__hideMiddle && node.children[3].children[0].className === "css-nhmlxf-Text esow0ct0"){
                        continue
                    }
                    if (config.__hideHard && node.children[3].children[0].className === "css-1qn5q6t-Text esow0ct0"){
                        continue
                    }
                    node.style.display = '';
                    Count++;
                } else {
                    node.style.display = 'none';
                }
            }

            if (Count != 0){
                bm.message({
                    type: 'warning',
                    message: `总共 ${Count} 道已解决问题`,
                    duration: 10,
                });
            }

        },
        switchEasyVisible: function() {
            let Count = 0;
            visible = !config.__hideEasy;
            let questions = document.querySelectorAll(".css-1h8d1g1-Text");
            for (let question of questions) {
                const node = Switch.getLevel0ParentNode(0, question);
                if (node != null) {
                    if (visible && !(config.__hideCollectionAnsweredQuestion && node.children[0].children[0].children[0].getAttribute("color") === "rgba(var(--dsw-success-rgb), 1)")) {
                        node.style.display = '';
                        Count++;
                    } else {
                        node.style.display = 'none';
                    }
                }
            }
            if (Count != 0){
                bm.message({
                    type: 'warning',
                    message: `总共 ${Count} 道简单问题`,
                    duration: 10,
                });
            }
        },
        switchMiddleVisible: function() {
            let Count = 0;
            visible = !config.__hideMiddle;
            let questions = document.querySelectorAll(".css-nhmlxf-Text");
            for (let question of questions) {
                const node = Switch.getLevel0ParentNode(0, question);
                if (node != null) {
                    if (visible && !(config.__hideCollectionAnsweredQuestion && node.children[0].children[0].children[0].getAttribute("color") === "rgba(var(--dsw-success-rgb), 1)")) {
                        node.style.display = '';
                        Count++;
                    } else {
                        node.style.display = 'none';
                    }
                }
            }
            if (Count != 0){
                bm.message({
                    type: 'warning',
                    message: `总共 ${Count} 道中等问题`,
                    duration: 10,
                });
            }
        },
        switchHardVisible: function() {
            let Count = 0;
            visible = !config.__hideHard;
            let questions = document.querySelectorAll(".css-1qn5q6t-Text");
            for (let question of questions) {
                const node = Switch.getLevel0ParentNode(0, question);
                if (node != null) {
                    if (visible && !(config.__hideCollectionAnsweredQuestion && node.children[0].children[0].children[0].getAttribute("color") === "rgba(var(--dsw-success-rgb), 1)")) {
                        node.style.display = '';
                        Count++;
                    } else {
                        node.style.display = 'none';
                    }
                }
            }
            if (Count != 0){
                bm.message({
                    type: 'warning',
                    message: `总共 ${Count} 道困难问题`,
                    duration: 10,
                });
            }
        },

        getLevel0ParentNode : function(depth, node) {
            if (!node || depth === 10) {
                return null;
            }
            if (typeof node.className === 'string' && node.className.match("ant-table-row ant-table-row-level-0")) {
                return node;
            } else if (node.parentNode) {
                return Switch.getLevel0ParentNode(depth + 1, node.parentNode);
            } else {
                return null;
            }
        }
    };

    const Insert = {
        base: {
            insertStyle: function() {
                if (document.getElementById('leetcode-assistant-style'))
                    return;
                let style = document.createElement('style');
                style.setAttribute('id', 'leetcode-assistant-style');
                style.innerText = `
                    .leetcode-assistant-copy-example-button {
                        border: 1px solid;
                        border-radius: 2px;
                        cursor: pointer;
                        padding: 1px 4px;
                        font-size: 0.8em;
                        margin-top: 5px;
                        width: fit-content;
                    }
                    .leetcode-assistant-highlight-accept-submission {
                        font-weight: bold;
                    }`;
                document.body.appendChild(style);
            },
            insertTextarea: function() {
                let textarea = document.createElement('textarea');
                textarea.setAttribute('id', 'leetcode-assistant-textarea');
                textarea.setAttribute('style', 'width: 0; height: 0;')
                document.body.appendChild(textarea);
            }
        },
        copy: {
            insertCopyStructCode: function() {
                const id_ = 'leetcode-assistant-copy-struct-button';
                if (document.getElementById(id_)) {
                    executing = false;
                    return;
                }
                let buttonContainer = document.querySelector('[class^=first-section-container]');
                let ref = buttonContainer.querySelector('button:nth-child(2)');
                let button = document.createElement('button');
                button.setAttribute('id', id_);
                button.className = ref.className;
                let span = document.createElement('span');
                span.className = ref.lastElementChild.className;
                span.innerText = '复制结构';
                button.appendChild(span);
                button.addEventListener('click', Copy.copyClassStruct);
                buttonContainer.appendChild(button);
                executing = false;
            },
            insertCopySubmissionCode: function() {
                let tbody = document.querySelector('.ant-table-tbody');
                let trs = [...tbody.querySelectorAll('tr')];
                let processTr = (tr) => {
                    let qid = tr.dataset.rowKey;
                    Basic.executeUtil((tr) => {
                        let cell = tr.querySelector(':nth-child(4)');
                        cell.title = '点击复制代码';
                        cell.style = 'cursor: pointer; color: #007aff';
                        cell.addEventListener('click', function() {
                            XHR.requestCode(qid);
                        });
                        cell.setAttribute('data-set-copy', 'true');
                    }, () => {
                        let cell = tr.querySelector(':nth-child(4)');
                        return cell && cell.dataset.setCopy !== 'true';
                    }, [tr]);
                }
                trs.forEach(processTr);
                Fun.highlightBestAcceptSubmission();
                Basic.observeChildList(tbody, (nodes) => {
                    let node = nodes[0];
                    if (node.tagName === 'TR') {
                        processTr(node);
                        Fun.highlightBestAcceptSubmission();
                    }
                });
                executing = false;
            },
            insertCopyExampleInput: function() {
                // 检查是否添加 "复制示例代码" 按钮
                let content = document.querySelector('[data-key=description-content] [class^=content] .notranslate');
                if (content.dataset.addedCopyExampleInputButton === 'true')
                    return;
                // 对每个 example 添加复制按钮
                let examples = [...content.querySelectorAll('pre')];
                for (let example of examples) {
                    let btn = document.createElement('div');
                    btn.innerText = '复制示例输入';
                    btn.className = 'leetcode-assistant-copy-example-button';
                    btn.addEventListener('click', () => {
                        Copy.copyExampleInput(example);
                    });
                    example.appendChild(btn);
                }
                content.setAttribute('data-added-copy-example-input-button', 'true');
                executing = false;
            },
            insertCopyTestInput: function() {
                function addCopyTestInputForInputInfo(inputInfo) {
                    inputInfo = inputInfo || document.querySelector('[class^=result-container] [class*=ValueContainer]');
                    if (inputInfo && inputInfo.dataset.setCopy !== 'true') {
                        inputInfo.addEventListener('click', function() {
                            // 检查是否支持语言
                            let lang = Get.getLanguage();
                            if (!config.__supportLanguage.includes(lang)) {
                                bm.message({
                                    type: 'warning',
                                    message: '目前不支持该语言的测试输入代码复制',
                                    duration: 1500,
                                });
                                executing = false;
                                return;
                            }
                            // 主要代码
                            let sp = new StatementParser(lang);
                            let expressions = this.innerText.trim().split('\n');
                            let declares = sp.getDeclaresFromCode(Get.getCode());
                            let statements = sp.getStatementsFromDeclaresAndExpressions(declares, expressions);
                            Copy.copy(statements);
                        });
                        inputInfo.setAttribute('data-set-copy', 'true');
                    }
                }
                let submissions = document.querySelector('[class^=submissions]');
                submissions.addEventListener('DOMNodeInserted', function(event) {
                    if (event.target.className.startsWith('container') || event.target.className.includes('Container')) {
                        Basic.executeUtil((container) => {
                            let inputInfo = container.querySelector('[class*=ValueContainer]');
                            addCopyTestInputForInputInfo(inputInfo);
                        }, () => {
                            return event.target.querySelector('[class*=ValueContainer]');
                        }, [event.target]);
                    }
                });
                addCopyTestInputForInputInfo();
                executing = false;
            },
        },
        switch: {
            insertHideCollectionAnsweredQuestionSwitch: function() {
                const id_ = 'leetcode-assistant-hide-answered-question-switch';
                if (document.getElementById(id_)) {
                    executing = false;
                    return;
                }
                let container = document.querySelector('.css-1hthjdu-NavbarList');
                let onchange = function() {
                    config.__hideCollectionAnsweredQuestion = !config.__hideCollectionAnsweredQuestion;
                    Switch.switchCollectionAnsweredQuestionVisible();
                };
                let text = '隐藏已解决';

                Switch.setSwitch(container, id_, onchange, text, false);
                Basic.executeUtil(() => {
                    let btns = [...document.querySelectorAll('.ant-table-pagination li>*')];
                    btns = btns.filter(btn => btn.tagName === 'BUTTON' || btn.tagName === 'A');
                    btns = btns.concat([...document.querySelectorAll('[class="ant-table-cell ant-table-column-has-sorters"]')]);
                    btns.forEach(btn => {
                        btn.addEventListener('click', function() {
                            setTimeout(function(){
                                Switch.switchCollectionAnsweredQuestionVisible();
                                Switch.switchEasyVisible();
                                Switch.switchMiddleVisible();
                                Switch.switchHardVisible();
                            }, 10);
                            return true;
                        });
                    });
                }, () => {
                    let nodes = [...document.querySelectorAll('.ant-table-tbody>tr')];
                    return nodes.length > 0;
                });
                executing = false;
            },
            insertHideEasySwitch: function() {
                const id_ = 'leetcode-assistant-hide-easy-switch';
                if (document.getElementById(id_)) {
                    executing = false;
                    return;
                }
                let container = document.querySelector('.css-1hthjdu-NavbarList');
                let onchange = function() {
                    config.__hideEasy = !config.__hideEasy;
                    Switch.switchEasyVisible();
                };
                let text = '隐藏简单';
                Switch.setSwitch(container, id_, onchange, text, false);
                executing = false;
            },
            insertHideMiddleSwitch: function() {
                const id_ = 'leetcode-assistant-hide-middle-switch';
                if (document.getElementById(id_)) {
                    executing = false;
                    return;
                }
                let container = document.querySelector('.css-1hthjdu-NavbarList');
                let onchange = function() {
                    config.__hideMiddle = !config.__hideMiddle;
                    Switch.switchMiddleVisible();
                };
                let text = '隐藏中等';
                Switch.setSwitch(container, id_, onchange, text, false);
                executing = false;
            },
            insertHideHardSwitch: function() {
                const id_ = 'leetcode-assistant-hide-hard-switch';
                if (document.getElementById(id_)) {
                    executing = false;
                    return;
                }
                let container = document.querySelector('.css-1hthjdu-NavbarList');
                let onchange = function() {
                    config.__hideHard = !config.__hideHard;
                    Switch.switchHardVisible();
                };
                let text = '隐藏困难';
                Switch.setSwitch(container, id_, onchange, text, false);
                executing = false;
            },







            insertRecommendVisibleSwitch: function() {
                const id_ = 'leetcode-assistant-recommend-visible-switch';
                if (document.getElementById(id_)) {
                    executing = false;
                    return;
                }
                let container = document.querySelector('.relative.space-x-5').nextElementSibling;
                let onchange = function() {
                    Basic.updateData({ recommendVisible: !this.checked });
                    Switch.switchRecommendVisible();
                };
                let text = '简洁';
                Switch.setSwitch(container, id_, onchange, text);
                executing = false;
            },


            insertHideAnsweredQuestionSwitch: function() {
                const id_ = 'leetcode-assistant-hide-answered-question-switch';
                if (document.getElementById(id_)) {
                    executing = false;
                    return;
                }
                let container = document.createElement('div');
                document.querySelector('.relative.space-x-5').parentElement.appendChild(container);
                let onchange = function() {
                    config.__hideAnsweredQuestion = !config.__hideAnsweredQuestion;
                    Switch.switchAnsweredQuestionVisible();
                };
                let text = '隐藏解决';
                Switch.setSwitch(container, id_, onchange, text, false);
                let navigation = document.querySelector('[role=navigation]');
                let btns = [...navigation.querySelectorAll('button')];
                btns.forEach(btn => {
                    btn.addEventListener("click", function() {
                        document.getElementById(id_).checked = false;
                        config.__hideAnsweredQuestion = false;
                        Switch.switchAnsweredQuestionVisible();
                        return true;
                    });
                });
                executing = false;
            },

            insertHideEasyQuestionSwitch: function() {
                const id_ = 'leetcode-assistant-hide-easy-question-switch';
                if (document.getElementById(id_)) {
                    executing = false;
                    return;
                }
                let container = document.createElement('div');
                document.querySelector('.relative.space-x-5').parentElement.appendChild(container);
                let onchange = function() {
                    config.__hideEasyQuestion = !config.__hideEasyQuestion;
                    Switch.switchEasyQuestionVisible();
                };
                let text = '隐藏简单';
                Switch.setSwitch(container, id_, onchange, text, false);
                let navigation = document.querySelector('[role=navigation]');
                let btns = [...navigation.querySelectorAll('button')];
                btns.forEach(btn => {
                    btn.addEventListener("click", function() {
                        document.getElementById(id_).checked = false;
                        config.__hideEasyQuestion = false;
                        Switch.switchEasyQuestionVisible();
                        return true;
                    });
                });
                executing = false;
            },

            insertHideMiddleQuestionSwitch: function() {
                const id_ = 'leetcode-assistant-hide-middle-question-switch';
                if (document.getElementById(id_)) {
                    executing = false;
                    return;
                }
                let container = document.createElement('div');
                document.querySelector('.relative.space-x-5').parentElement.appendChild(container);
                let onchange = function() {
                    config.__hideMiddleQuestion = !config.__hideMiddleQuestion;
                    Switch.switchMiddleQuestionVisible();
                };
                let text = '隐藏中等';
                Switch.setSwitch(container, id_, onchange, text, false);
                let navigation = document.querySelector('[role=navigation]');
                let btns = [...navigation.querySelectorAll('button')];
                btns.forEach(btn => {
                    btn.addEventListener("click", function() {
                        document.getElementById(id_).checked = false;
                        config.__hideMiddleQuestion = false;
                        Switch.switchMiddleQuestionVisible();
                        return true;
                    });
                });
                executing = false;
            },

            insertHideHardQuestionSwitch: function() {
                const id_ = 'leetcode-assistant-hide-hard-question-switch';
                if (document.getElementById(id_)) {
                    executing = false;
                    return;
                }
                let container = document.createElement('div');
                document.querySelector('.relative.space-x-5').parentElement.appendChild(container);
                let onchange = function() {
                    config.__hideHardQuestion = !config.__hideHardQuestion;
                    Switch.switchHardQuestionVisible();
                };
                let text = '隐藏困难';
                Switch.setSwitch(container, id_, onchange, text, false);
                let navigation = document.querySelector('[role=navigation]');
                let btns = [...navigation.querySelectorAll('button')];
                btns.forEach(btn => {
                    btn.addEventListener("click", function() {
                        document.getElementById(id_).checked = false;
                        config.__hideHardQuestion = false;
                        Switch.switchHardQuestionVisible();
                        return true;
                    });
                });
                executing = false;
            },









            insertAutoAdjustViewSwitch: function() {
                const id_ = 'leetcode-assistant-auto-adjust-view-switch';
                if (document.getElementById(id_)) {
                    executing = false;
                    return;
                }
                let container = document.querySelector('[data-status] nav > ul');
                let onchange = function() {
                    Basic.updateData({ autoAdjustView: this.checked });
                };
                let text = '自动调节视图';
                Switch.setSwitch(container, id_, onchange, text);
                executing = false;
            }
        }
    };

    const Copy = {
        copy: function(value) {
            let textarea = document.getElementById('leetcode-assistant-textarea');
            textarea.value = value;
            textarea.setAttribute('value', value);
            textarea.select();
            document.execCommand('copy');
            bm.message({
                type: 'success',
                message: '复制成功',
                duration: 1500,
            });
        },
        copyClassStruct: function() {
            // 检查语言是否支持
            let lang = Get.getLanguage();
            if (!config.__supportLanguage.includes(lang)) {
                bm.message({
                    type: 'warning',
                    message: '目前不支持该语言的结构类代码复制',
                    duration: 1500,
                });
                executing = false;
                return;
            }
            // 主要代码
            let sp = new StatementParser(lang);
            let classStructCode = sp.getClassStructFromCode(Get.getCode());
            if (!classStructCode) {
                bm.message({
                    type: 'warning',
                    message: '结构类代码不存在',
                    duration: 1500,
                });
                return;
            }
            Copy.copy(classStructCode);
        },
        copyExampleInput: function(example) {
            // 检查语言是否支持
            let lang = Get.getLanguage();
            if (!config.__supportLanguage.includes(lang)) {
                bm.message({
                    type: 'warning',
                    message: '目前不支持该语言的示例输入代码复制',
                    duration: 1500,
                });
                executing = false;
                return;
            }
            let sp = new StatementParser(lang);
            // 获取 declares
            let declares = sp.getDeclaresFromCode(Get.getCode());
            // 获取 expressions
            let strong = example.querySelector('strong');
            let inputText = "";
            if (strong && strong.nextSibling) {
                let inputTextElement = strong.nextSibling;
                while ((inputTextElement instanceof Text) || !['STRONG', 'B'].includes(inputTextElement.tagName)) {
                    if (inputTextElement instanceof Text) {
                        inputText += inputTextElement.wholeText;
                    } else {
                        inputText += inputTextElement.innerText;
                    }
                    inputTextElement = inputTextElement.nextSibling;
                }
            } else {
                inputText = example.innerText.replace(/\n/g, '').match(/输入:(.+)输出:/)[1];
            }
            let expressions = inputText.trim().replace(/,$/, '');
            if (inputText.replace(/".+?"/g, '').includes(',')) {
                // 无视字符串后存在逗号分隔符，说明有多个输入
                expressions = expressions.split(/,\s+/);
            } else {
                // 单个输入
                expressions = [expressions];
            }
            // 生成语句并复制
            Copy.copy(sp.getStatementsFromDeclaresAndExpressions(declares, expressions));
        },
    };

    const XHR = {
        requestCode: function(qid) {
            let query = `
                query mySubmissionDetail($id: ID!) {
                  submissionDetail(submissionId: $id) {
                    id
                    code
                    runtime
                    memory
                    rawMemory
                    statusDisplay
                    timestamp
                    lang
                    passedTestCaseCnt
                    totalTestCaseCnt
                    sourceUrl
                    question {
                      titleSlug
                      title
                      translatedTitle
                      questionId
                      __typename
                    }
                    ... on GeneralSubmissionNode {
                      outputDetail {
                        codeOutput
                        expectedOutput
                        input
                        compileError
                        runtimeError
                        lastTestcase
                        __typename
                      }
                      __typename
                    }
                    submissionComment {
                      comment
                      flagType
                      __typename
                    }
                    __typename
                  }
                }`;
            $.ajax({
                url: 'https://leetcode.cn/graphql/',
                method: 'POST',
                contentType: 'application/json',
                data: JSON.stringify({
                    operationName: 'mySubmissionDetail',
                    query: query,
                    variables: {
                        id: qid
                    },
                }),
            }).then(res => {
                Copy.copy(res.data.submissionDetail.code);
            });
        }
    };

    const Get = {
        getLanguage: function() {
            return document.getElementById('lang-select').innerText;
        },
        getCode: function() {
            return document.querySelector('[name=code]').value;
        }
    };

    const Fun = {
        adjustViewScale: function(left, right) {
            if (!config.autoAdjustView) {
                executing = false;
                return;
            }
            let splitLine = document.querySelector('[data-is-collapsed]');
            let leftPart = splitLine.previousElementSibling;
            let rightPart = splitLine.nextElementSibling;
            let leftPartFlex = leftPart.style.flex.match(/\d+\.\d+/)[0];
            let rightPartFlex = rightPart.style.flex.match(/\d+\.\d+/)[0];
            leftPart.style.flex = leftPart.style.flex.replace(leftPartFlex, `${left}`);
            rightPart.style.flex = rightPart.style.flex.replace(rightPartFlex, `${right}`);
            executing = false;
        },
        highlightBestAcceptSubmission: function() {
            let highlightClassName = 'leetcode-assistant-highlight-accept-submission';
            let items = [...document.querySelectorAll('tr[data-row-key]')];
            let acItems = items.filter(item => item.querySelector('a[class^=ac]'));
            if (acItems.length === 0)
                return;
            let matchTimeMem = acItems.map(item => item.innerText.match(/(\d+)\sms.+?(\d+\.?\d)\sMB/).slice(1, 3));
            let timeList = matchTimeMem.map(res => parseInt(res[0]));
            let memList = matchTimeMem.map(res => parseFloat(res[1]));
            let targetIndex = 0;
            for (let i = 0; i < items.length; i++) {
                if (timeList[i] < timeList[targetIndex] || (timeList[i] === timeList[targetIndex] && memList[i] < memList[targetIndex])) {
                    targetIndex = i;
                }
            }
            let lastTarget = document.querySelector(`.${highlightClassName}`);
            if (lastTarget)
                lastTarget.classList.remove(highlightClassName);
            acItems[targetIndex].classList.add(highlightClassName);
        }
    };

    function main() {
        console.log(`LeetCode Assistant version ${__VERSION__}`);
        if (location.href.match(/\/problems\/[a-zA-Z0-9\-]+\//)) { // /problems/*
            Basic.executeUtil(() => {
                Insert.copy.insertCopyStructCode();
                Insert.switch.insertAutoAdjustViewSwitch();
            }, () => {
                return document.querySelector('[class^=first-section-container]');
            });
            if (location.href.match(/\/problems\/[a-zA-Z0-9\-]+\/$/)) { // 题目描述
                Fun.adjustViewScale(0.618, 0.382);
                Basic.executeUtil(Insert.copy.insertCopyExampleInput, () => {
                    let codeDOM = document.querySelector('.editor-scrollable');
                    let content = document.querySelector('[data-key=description-content] [class^=content] .notranslate');
                    return codeDOM && content && content.querySelector('pre');
                });
            } else if (location.href.includes('/solution/')) { // 题解
                Fun.adjustViewScale(0.382, 0.618);
            } else if (location.href.includes('/submissions/')) { // 提交记录
                Basic.executeUtil(() => {
                    Insert.copy.insertCopySubmissionCode();
                    Insert.copy.insertCopyTestInput();
                }, () => {
                    return document.querySelector('.ant-table-thead');
                });
            }
        } else if (location.href.startsWith('https://leetcode.cn/problemset/')) { // 首页
            Insert.switch.insertRecommendVisibleSwitch();
            Switch.switchRecommendVisible();
            Basic.executeUtil(() => {
                Insert.switch.insertHideAnsweredQuestionSwitch();
                Switch.switchAnsweredQuestionVisible();
                Insert.switch.insertHideEasyQuestionSwitch();
                Switch.switchEasyQuestionVisible();
                Insert.switch.insertHideMiddleQuestionSwitch();
                Switch.switchMiddleQuestionVisible();
                Insert.switch.insertHideHardQuestionSwitch();
                Switch.switchHardQuestionVisible();
            }, () => {
                let navigation = document.querySelector('[role=navigation]');
                return navigation && navigation.innerText.length > 0;
            });
        } else if (location.href.startsWith('https://leetcode.cn/company/') || location.href.startsWith('https://leetcode.cn/problem-list/')) { // company和problem-list
            Insert.switch.insertHideCollectionAnsweredQuestionSwitch();
            Insert.switch.insertHideEasySwitch();
            Insert.switch.insertHideMiddleSwitch();
            Insert.switch.insertHideHardSwitch();
            Basic.executeUtil(() => {
                Insert.switch.insertHideCollectionAnsweredQuestionSwitch();
                Switch.switchCollectionAnsweredQuestionVisible();
                Insert.switch.insertHideEasySwitch();
                Switch.switchEasyVisible();
                Insert.switch.insertHideMiddleSwitch();
                Switch.switchMiddleVisible();
                Insert.switch.insertHideHardSwitch();
                Switch.switchHardVisible();
            }, () => {
                let navigation = document.querySelector('#lc-header>nav>ul');
                return navigation && navigation.childElementCount > 0;
            });
        } else {
            executing = false;
        }
    }

    window.addEventListener('load', () => {
        Basic.updateData();
        Insert.base.insertStyle();
        Insert.base.insertTextarea();
        Basic.listenHistoryState();
        main();
    });
})();
