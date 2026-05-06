import {render, screen} from '@testing-library/react-native';
import React from 'react';
import type {CustomRendererProps, TBlock} from 'react-native-render-html';
import BulletItemRenderer from '@components/HTMLEngineProvider/HTMLRenderers/BulletItemRenderer';
import ULRenderer from '@components/HTMLEngineProvider/HTMLRenderers/ULRenderer';
import RenderHTML from '@components/RenderHTML';
import CONST from '@src/CONST';

jest.mock('@hooks/useWindowDimensions', () => () => ({windowWidth: 400}));
jest.mock('@hooks/useHasTextAncestor', () => () => false);

// Capture the html string ultimately passed to react-native-render-html so we can
// assert the orphaned <br/> stripping happens before the library sees the HTML.
const capturedSource: {html?: string} = {};
jest.mock('react-native-render-html', () => {
    const ReactModule = jest.requireActual<typeof React>('react');
    const {View: MockView, Text: MockText} = jest.requireActual<{View: React.ComponentType; Text: React.ComponentType}>('react-native');
    return {
        RenderHTMLConfigProvider: ({children}: {children: React.ReactNode}) => children,
        RenderHTMLSource: ({source}: {source: {html?: string}}) => {
            capturedSource.html = source?.html;
            return ReactModule.createElement(MockView);
        },
        TNodeChildrenRenderer: ({tnode}: {tnode?: {mockText?: string}}) => ReactModule.createElement(MockText, null, tnode?.mockText ?? ''),
    };
});

// Bypass ExpensiMark in these tests — we want to assert the regex stripping logic
// in RenderHTML, not the upstream parser's behavior.
jest.mock('@libs/Parser', () => ({
    __esModule: true,
    default: {replace: (html: string) => html},
}));

const buildTNode = (text = '') => ({mockText: text}) as unknown as CustomRendererProps<TBlock>['tnode'];

describe('Bullet list rendering', () => {
    beforeEach(() => {
        capturedSource.html = undefined;
    });

    describe('ULRenderer', () => {
        it('renders its children', () => {
            render(
                // @ts-expect-error — only the props read by the renderer are needed for this test
                <ULRenderer
                    tnode={buildTNode('child content')}
                    style={{}}
                />,
            );
            expect(screen.getByText('child content')).toBeTruthy();
        });
    });

    describe('BulletItemRenderer (used for both <li> and <bullet-item>)', () => {
        it('renders a bullet marker next to the item content', () => {
            // @ts-expect-error — only the props read by the renderer are needed for this test
            render(<BulletItemRenderer tnode={buildTNode('First item')} />);
            expect(screen.getByText(CONST.DOT_SEPARATOR)).toBeTruthy();
            expect(screen.getByText('First item')).toBeTruthy();
        });
    });

    describe('RenderHTML strips orphaned <br/> tags inside <ul>', () => {
        it('strips <br/> immediately before </ul>', () => {
            render(<RenderHTML html="<ul><li>One</li><li>Two</li><br/></ul>" />);
            expect(capturedSource.html).toBe('<ul><li>One</li><li>Two</li></ul>');
        });

        it('strips <br> (no slash) immediately before </ul>', () => {
            render(<RenderHTML html="<ul><li>One</li><li>Two</li><br></ul>" />);
            expect(capturedSource.html).toBe('<ul><li>One</li><li>Two</li></ul>');
        });

        it('strips <br/> appearing between </li> and the next <li>', () => {
            render(<RenderHTML html="<ul><li>One</li><br/><li>Two</li></ul>" />);
            expect(capturedSource.html).toBe('<ul><li>One</li><li>Two</li></ul>');
        });

        it('leaves a valid <ul>/<li> list untouched', () => {
            render(<RenderHTML html="<ul><li>One</li><li>Two</li></ul>" />);
            expect(capturedSource.html).toBe('<ul><li>One</li><li>Two</li></ul>');
        });

        it('does not strip <br/> outside of <ul> lists', () => {
            render(<RenderHTML html="<p>line1<br/>line2</p>" />);
            expect(capturedSource.html).toBe('<p>line1<br/>line2</p>');
        });
    });
});
