// ==UserScript==

// @name         토끼 오류 해결

// @namespace    http://tampermonkey.net/

// @version      3.5

// @description  최적화된 CSS 적용

// @author       User

// @match        *://*toki*/*

// @run-at       document-end

// @grant        none

// ==/UserScript==

(function() {

    'use strict';

    // 1. 렉 유발 요소들의 선택자 (소스코드 분석 결과)

    const targets = [

        "header.main-header .m-menu",

        "section.sidebar",

        ".control-sidebar-content"

    ];

    // 2. 렉 제거 및 CSS 교체 함수

    function killLag() {

        if (!window.jQuery) return;

        const $ = window.jQuery;

        targets.forEach(selector => {

            const $el = $(selector);



            // (A) JS로 작동하는 렉 유발 기능 강제 해제 (Unstick)

            // 이 명령어가 실행되면 스크롤할 때마다 계산하는 무거운 작업이 즉시 중단됩니다.

            if ($el.sticky) {

                try {

                    $el.unstick();

                } catch(e) {}

            }

            // (B) 렉 없는 부드러운 고정 방식(CSS)으로 교체

            // JS를 껐으니 화면에서 사라지거나 고정이 풀릴 수 있는데, 이걸 CSS로 다시 잡아줍니다.

            $el.css({

                'position': 'sticky',

                'top': '0',

                'z-index': '1030',

                'width': '100% !important' // 레이아웃 깨짐 방지

            });



            // 사이드바의 경우 위치 조정

            if (selector.includes('sidebar')) {

                 $el.css('top', '50px');

            }

        });


    }

    // 3. 타이밍 문제 해결

    window.addEventListener('load', killLag);

})();

