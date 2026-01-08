// ==UserScript==

// @name         토끼 화면 조정

// @namespace    http://tampermonkey.net/

// @version      4.0

// @description  회차 페이지에서 양옆 여백 없이 딱 맞는 데스크탑 화면(980px)으로 보여줍니다.

// @author       You

// @match        *://newtoki*.com/webtoon/1*?*
// @match        *://newtoki*.com/webtoon/2*?*
// @match        *://newtoki*.com/webtoon/3*?*
// @match        *://newtoki*.com/webtoon/4*?*
// @match        *://newtoki*.com/webtoon/5*?*
// @match        *://newtoki*.com/webtoon/6*?*
// @match        *://newtoki*.com/webtoon/7*?*
// @match        *://newtoki*.com/webtoon/8*?*
// @match        *://newtoki*.com/webtoon/9*?*

// @match        *://newtoki*.com/webtoon/1*/*
// @match        *://newtoki*.com/webtoon/2*/*
// @match        *://newtoki*.com/webtoon/3*/*
// @match        *://newtoki*.com/webtoon/4*/*
// @match        *://newtoki*.com/webtoon/5*/*
// @match        *://newtoki*.com/webtoon/6*/*
// @match        *://newtoki*.com/webtoon/7*/*
// @match        *://newtoki*.com/webtoon/8*/*
// @match        *://newtoki*.com/webtoon/9*/*

// @match        *://newtoki*.com/bbs//board*

// @run-at       document-start

// @grant        none

// ==/UserScript==

(function() {

    'use strict';

    // [설정] 화면 너비 값

    // 980 ~ 1024 사이가 데스크탑 UI는 유지되면서 양옆 여백이 없는 "꽉 찬" 수치입니다.

    // 만약 여전히 여백이 보이면 이 숫자를 조금씩 줄이세요 (예: 960).

    // 만약 화면이 잘리면 이 숫자를 조금씩 늘리세요 (예: 1050).

    const FIT_WIDTH = '860';

    const path = window.location.pathname;

    const pathParts = path.split('/').filter(part => part.length > 0);

    // 조건: '/webtoon/' + 'ID' + '제목'이 모두 있는 경우 (회차 페이지만 적용)

    const isEpisodePage = 1;

    if (isEpisodePage) {

        // 1. 기존 뷰포트 태그 찾기

        let viewport = document.querySelector("meta[name=viewport]");

        const forceFitDesktop = () => {

            if (!viewport) {

                viewport = document.createElement("meta");

                viewport.name = "viewport";

                document.head.appendChild(viewport);

            }

            // width를 컨텐츠 크기에 딱 맞춤 (1000px)

            // initial-scale이나 minimum-scale을 설정하지 않아 브라우저가 알아서 꽉 차게 맞추도록 유도

            viewport.setAttribute("content", `width=${FIT_WIDTH}, user-scalable=yes`);

        };

        // 2. 실행

        forceFitDesktop();

        // 3. 사이트가 로딩 중 모바일로 강제 변경하는 것 방지

        const observer = new MutationObserver((mutations) => {

            mutations.forEach((mutation) => {

                if (mutation.target === viewport || (mutation.addedNodes.length > 0 && mutation.addedNodes[0].name === 'viewport')) {

                    if (!viewport.getAttribute("content").includes(`width=${FIT_WIDTH}`)) {

                        forceFitDesktop();

                    }

                }

            });

        });

        observer.observe(document.head, { attributes: true, childList: true, subtree: true, attributeFilter: ['content'] });

    }

})();