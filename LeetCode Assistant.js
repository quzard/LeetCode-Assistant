// ==UserScript==
// @name         LeetCode Assistant
// @namespace    http://tampermonkey.net/
// @version      1.0.8
// @require      https://cdn.bootcss.com/jquery/3.4.1/jquery.js
// @require      https://greasyfork.org/scripts/422854-bubble-message.js
// @require      https://greasyfork.org/scripts/432416-statement-parser.js
// @match        *://leetcode-cn.com/problemset/*
// @match        *://leetcode-cn.com/company/*/*
// @match        *://leetcode-cn.com/problem-list/*/*

// @grant        GM_setValue
// @grant        GM_getValue
// ==/UserScript==
// noinspection JSUnresolvedFunction

(function() {
    const __VERSION__ = '1.0.8';
    let executing = false;
    const bm = new BubbleMessage();
    bm.config.width = 400;

    const config = {
        recommendVisible: false,
        __hideAnsweredQuestion: false,
        __hideEasy: false,
        __hideMiddle: false,
        __hideHard: false,
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
                defaultChecked = false;
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
        	const url = window.location.href;
            let rowGroup = document.querySelector('[role=rowgroup]');
            let nodes = [...rowGroup.querySelectorAll('[role=row]')];
            let matchPage = location.href.match(/\?page=(\d+)/);
            if (!matchPage || parseInt(matchPage[1]) === 1)
                nodes = nodes.slice(1);
            nodes = nodes.filter(node => node.querySelector('svg.text-green-s'));
            Switch.switchVisible(nodes, !config.__hideAnsweredQuestion, 'flex');
        },

        switchAnsweredQuestionVisible2: function() {
        	visible = !config.__hideAnsweredQuestion;
        	defaultDisplay = 'flex';
			let svgCollections = document.querySelectorAll(".ant-table-tbody svg");
		    for (let svg of svgCollections) {
		        if (svg.getAttribute("color") === "rgba(var(--dsw-success-rgb), 1)") {
		            const node = Switch.getLevel0ParentNode(0, svg);
			        if (node != null) {
			            if (visible) {
                            if (!(config.__hideEasy && node.children[3].children[0].className === "css-1h8d1g1-Text esow0ct0")){
                                if (!(config.__hideMiddle && node.children[3].children[0].className === "css-nhmlxf-Text esow0ct0")){
                                    if (!(config.__hideHard && node.children[3].children[0].className === "css-1qn5q6t-Text esow0ct0")){
                                        node.style.display = '';
                                    }
                                }
                            }
			            } else {
			                node.style.display = 'none';
			            }
			        }
		        }
		    }
        },
        switchEasyVisible: function() {
            visible = !config.__hideEasy;
            defaultDisplay = 'flex';
            let questions = document.querySelectorAll(".css-1h8d1g1-Text");
            for (let question of questions) {
                const node = Switch.getLevel0ParentNode(0, question);
                if (node != null) {
                    if (visible && !(config.__hideAnsweredQuestion && node.children[0].children[0].children[0].getAttribute("color") === "rgba(var(--dsw-success-rgb), 1)")) {
                        node.style.display = '';
                    } else {
                        node.style.display = 'none';
                    }
                }
            }
        },
        switchMiddleVisible: function() {
            visible = !config.__hideMiddle;
            defaultDisplay = 'flex';
            let questions = document.querySelectorAll(".css-nhmlxf-Text");
            for (let question of questions) {
                const node = Switch.getLevel0ParentNode(0, question);
                if (node != null) {
                    if (visible && !(config.__hideAnsweredQuestion && node.children[0].children[0].children[0].getAttribute("color") === "rgba(var(--dsw-success-rgb), 1)")) {
                        node.style.display = '';
                    } else {
                        node.style.display = 'none';
                    }
                }
            }
        },
        switchHardVisible: function() {
            visible = !config.__hideHard;
            defaultDisplay = 'flex';
            let questions = document.querySelectorAll(".css-1qn5q6t-Text");
            for (let question of questions) {
                const node = Switch.getLevel0ParentNode(0, question);
                if (node != null) {
                    if (visible && !(config.__hideAnsweredQuestion && node.children[0].children[0].children[0].getAttribute("color") === "rgba(var(--dsw-success-rgb), 1)")) {
                        node.style.display = '';
                    } else {
                        node.style.display = 'none';
                    }
                }
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
		},
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
        switch: {
            insertHideAnsweredQuestionSwitchCompany: function() {
                const id_ = 'leetcode-assistant-hide-answered-question-switch';
                if (document.getElementById(id_)) {
                    executing = false;
                    return;
                }
                let container = document.querySelector('.css-1hthjdu-NavbarList');
                let onchange = function() {
                    config.__hideAnsweredQuestion = !config.__hideAnsweredQuestion;
                    Switch.switchAnsweredQuestionVisible2();
                };
                let text = '隐藏已解决';
                Switch.setSwitch(container, id_, onchange, text, false);
                let navigation = document.querySelector('[class="ant-pagination ant-table-pagination ant-table-pagination-right"]');
                if (navigation) {
                    let btns = [...navigation.querySelectorAll('button')];
                    btns.forEach(btn => {
                        btn.addEventListener("click", function() {
                            document.getElementById(id_).checked = false;
                            config.__hideHard = false;
                            Switch.switchHardVisible();
                            return true;
                        });
                    });
                };
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
                let text = '隐藏简单问题';
                Switch.setSwitch(container, id_, onchange, text, false);
                let navigation = document.querySelector('[class="ant-pagination ant-table-pagination ant-table-pagination-right"]');
                if (navigation) {
                    let btns = [...navigation.querySelectorAll('button')];
                    btns.forEach(btn => {
                        btn.addEventListener("click", function() {
                            document.getElementById(id_).checked = false;
                            config.__hideHard = false;
                            Switch.switchHardVisible();
                            return true;
                        });
                    });
                };
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
                let text = '隐藏中等问题';
                Switch.setSwitch(container, id_, onchange, text, false);
                let navigation = document.querySelector('[class="ant-pagination ant-table-pagination ant-table-pagination-right"]');
                if (navigation) {
                    let btns = [...navigation.querySelectorAll('button')];
                    btns.forEach(btn => {
                        btn.addEventListener("click", function() {
                            document.getElementById(id_).checked = false;
                            config.__hideHard = false;
                            Switch.switchHardVisible();
                            return true;
                        });
                    });
                };
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
                let text = '隐藏困难问题';
                Switch.setSwitch(container, id_, onchange, text, false);
                let navigation = document.querySelector('[class="ant-pagination ant-table-pagination ant-table-pagination-right"]');
                if (navigation) {
                    let btns = [...navigation.querySelectorAll('button')];
                    btns.forEach(btn => {
                        btn.addEventListener("click", function() {
                            document.getElementById(id_).checked = false;
                            config.__hideHard = false;
                            Switch.switchHardVisible();
                            return true;
                        });
                    });
                };
                executing = false;
            },

            // 首页
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
                let text = '简洁模式';
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
                let text = '隐藏已解决';
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
            }
        }
    };

    function main() {
        console.log(`LeetCode Assistant version ${__VERSION__}`);
        if (location.href.startsWith('https://leetcode-cn.com/problemset/')) { // 首页
            Insert.switch.insertRecommendVisibleSwitch();
            Switch.switchRecommendVisible();
            Basic.executeUtil(() => {
                Insert.switch.insertHideAnsweredQuestionSwitch();
                Switch.switchAnsweredQuestionVisible();
            }, () => {
                let navigation = document.querySelector('[role=navigation]');
                return navigation && navigation.innerText.length > 0;
            });
        } else if (location.href.startsWith('https://leetcode-cn.com/company/') || location.href.startsWith('https://leetcode-cn.com/problem-list/')) { // company和problem-list
            Basic.executeUtil(() => {
                Insert.switch.insertHideAnsweredQuestionSwitchCompany();
        		Switch.switchAnsweredQuestionVisible2();
                Insert.switch.insertHideEasySwitch();
                Switch.switchEasyVisible();
                Insert.switch.insertHideMiddleSwitch();
                Switch.switchMiddleVisible();
                Insert.switch.insertHideHardSwitch();
                Switch.switchHardVisible();
            }, () => {
                let data = document.querySelector('[class="ant-table-row ant-table-row-level-0"]');
                return data;
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