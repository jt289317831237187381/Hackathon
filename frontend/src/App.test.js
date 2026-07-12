import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from './App';
import { categories, currentUser, products, reviewsByProduct } from './data/demoData';

const FIRST_PRODUCT_ID = 'sony-wh-1000xm6-black';

beforeEach(() => {
  window.localStorage.clear();
  window.location.hash = '#/';
  window.scrollTo = jest.fn();
});

test('canonical products start without invented community evidence and fixtures retain provenance', () => {
  expect(products).toHaveLength(15);
  expect(categories.map((category) => category.id)).not.toContain('home');

  products.forEach((product) => {
    expect(product).toMatchObject({ rating: null, reviewCount: 0, lifespanMonths: null, repairability: null, officialSpecs: true, isRealProduct: true, productProvenance: 'official_manufacturer_website' });
    expect(product.imageUrl).toMatch(/^https:\/\//);
    expect(product.imageSourceUrl).toMatch(/^https:\/\//);
    expect(product.imageAlt).toEqual(expect.any(String));
    expect(reviewsByProduct[product.id]).toHaveLength(8);
    expect(new Set(reviewsByProduct[product.id].map((review) => review.rating))).toEqual(new Set([1, 2, 3, 4, 5]));
  });

  const syntheticReviews = Object.values(reviewsByProduct).flat();
  expect(syntheticReviews).toHaveLength(120);
  expect(syntheticReviews.every((review) => review.isSynthetic && review.provenance === 'synthetic_demo')).toBe(true);
  expect(syntheticReviews.every((review) => review.helpful === 0 && review.comments === 0)).toBe(true);

  const switchReviews = reviewsByProduct['nintendo-switch-2'];
  expect(Math.max(...switchReviews.map((review) => review.ownershipMonths))).toBeLessThanOrEqual(13);
  const mixerReviews = reviewsByProduct['kitchenaid-ksm195-spearmint'];
  expect(Math.max(...mixerReviews.map((review) => review.ownershipMonths))).toBeLessThanOrEqual(6);
});

test('visitors can browse the real-product catalogue without signing in', async () => {
  render(<App />);

  expect(screen.getByRole('heading', { name: 'What people are weighing up' })).toBeInTheDocument();
  expect(screen.getByText(/official product facts and clearly labelled synthetic prompts/i)).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Discover' }));

  expect(await screen.findByRole('heading', { name: 'Discover products' })).toBeInTheDocument();
  expect(screen.getByText('15 products')).toBeInTheDocument();
  expect(screen.getByText('Sony WH-1000XM6 Wireless Noise Cancelling Headphones (Black)')).toBeInTheDocument();
  expect(screen.queryByRole('option', { name: 'Home' })).not.toBeInTheDocument();
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

test('credential sign-in returns to the protected save action for the canonical product id', async () => {
  render(<App />);

  fireEvent.click(screen.getAllByRole('button', { name: 'Save' })[0]);
  const dialog = screen.getByRole('dialog');
  const auth = within(dialog);
  expect(auth.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument();

  fireEvent.change(auth.getByLabelText('Username or email'), { target: { value: 'maya' } });
  fireEvent.change(auth.getByLabelText('Password', { selector: 'input' }), { target: { value: 'worthit123' } });
  fireEvent.click(auth.getAllByRole('button', { name: /^sign in$/i }).at(-1));

  await waitFor(() => {
    expect(JSON.parse(window.localStorage.getItem('worthit.session.v1')).displayName).toBe('Maya Chen');
    expect(JSON.parse(window.localStorage.getItem('worthit.saved.v1'))).toContain(FIRST_PRODUCT_ID);
  });
});

test('sign-up verifies a phone number before returning to the protected save action', async () => {
  render(<App />);

  fireEvent.click(screen.getAllByRole('button', { name: 'Save' })[0]);
  const dialog = screen.getByRole('dialog');
  const auth = within(dialog);
  fireEvent.click(auth.getByRole('button', { name: /^create account$/i }));

  expect(auth.getByRole('heading', { name: 'Create account' })).toBeInTheDocument();
  fireEvent.change(auth.getByLabelText('Email'), { target: { value: 'newmember@worthit.test' } });
  fireEvent.change(auth.getByLabelText('Username'), { target: { value: 'newmember' } });
  fireEvent.change(auth.getByLabelText(/^Password/, { selector: 'input' }), { target: { value: 'lasting123' } });
  fireEvent.change(auth.getByLabelText('Phone number', { selector: 'input' }), { target: { value: '412 345 678' } });
  fireEvent.click(auth.getByRole('button', { name: /continue to phone verification/i }));

  expect(await auth.findByRole('heading', { name: 'Verify your phone' })).toBeInTheDocument();
  fireEvent.change(auth.getByLabelText('Verification code'), { target: { value: '123456' } });
  fireEvent.click(auth.getByRole('button', { name: /verify phone & create account/i }));

  await waitFor(() => {
    const session = JSON.parse(window.localStorage.getItem('worthit.session.v1'));
    expect(session).toMatchObject({ username: 'newmember', email: 'newmember@worthit.test', phoneVerified: true });
    expect(JSON.parse(window.localStorage.getItem('worthit.saved.v1'))).toContain(FIRST_PRODUCT_ID);
  });
});

test('product pages distinguish official facts, missing evidence and synthetic reviews', () => {
  window.localStorage.setItem('worthit.session.v1', JSON.stringify(currentUser));
  window.location.hash = '#/product/makita-ddf486z';
  render(<App />);

  expect(screen.getByRole('heading', { name: 'Makita DDF486Z 18V Brushless Heavy Duty Driver Drill' })).toBeInTheDocument();
  expect(screen.getByRole('img', { name: 'Makita DDF486Z 18V Brushless Heavy Duty Driver Drill on a white background' })).toHaveAttribute(
    'src',
    'https://dtis8tdmkp4fg.cloudfront.net/products/cordless/lxt-18v-36v/drills-fastening/hammer-driver-drills/ddf486z/ddf486z-001.jpg'
  );
  expect(screen.getAllByText('Official specifications').length).toBeGreaterThanOrEqual(2);
  expect(screen.getAllByText('Not listed')).toHaveLength(2);
  expect(screen.getAllByText('Not enough data')).toHaveLength(2);
  expect(screen.getByText('No community reviews yet')).toBeInTheDocument();
  expect(screen.getAllByText('Synthetic demo review')).toHaveLength(8);
  expect(screen.getAllByText('Synthetic demo profile')).toHaveLength(8);
  expect(screen.getByRole('link', { name: /view specification source/i })).toHaveAttribute(
    'href',
    'https://makita.com.au/cordless/lxt-18v-36v/drills-fastening/hammer-driver-drills/ddf486z-18v-brushless-heavy-duty-driver-drill'
  );
  expect(screen.getByRole('link', { name: /view official image source/i })).toHaveAttribute(
    'href',
    'https://makita.com.au/cordless/lxt-18v-36v/drills-fastening/hammer-driver-drills/ddf486z-18v-brushless-heavy-duty-driver-drill'
  );

  const syntheticHelpfulButtons = screen.getAllByRole('button', { name: /Helpful · 0/i });
  expect(syntheticHelpfulButtons).toHaveLength(8);
  syntheticHelpfulButtons.forEach((button) => expect(button).toBeDisabled());
  expect(screen.getByRole('heading', { name: 'Probably skip' })).toBeInTheDocument();
  expect(screen.getByText(/guidance, not financial advice/i)).toBeInTheDocument();
});

test('official product imagery falls back without leaving a broken image', () => {
  window.location.hash = '#/product/makita-ddf486z';
  render(<App />);

  const image = screen.getByRole('img', { name: 'Makita DDF486Z 18V Brushless Heavy Duty Driver Drill on a white background' });
  fireEvent.error(image);

  expect(screen.queryByRole('img', { name: 'Makita DDF486Z 18V Brushless Heavy Duty Driver Drill on a white background' })).not.toBeInTheDocument();
});

test('a local first-party review remains interactive and is the only review counted', async () => {
  window.localStorage.setItem('worthit.session.v1', JSON.stringify(currentUser));
  window.location.hash = `#/product/${FIRST_PRODUCT_ID}`;
  render(<App />);

  fireEvent.click(screen.getByRole('button', { name: /Share your experience/i }));
  const dialog = screen.getByRole('dialog');
  fireEvent.click(within(dialog).getByRole('button', { name: '4 stars' }));
  fireEvent.change(within(dialog).getByLabelText('Review title'), { target: { value: 'A local first-party note' } });
  fireEvent.click(within(dialog).getByRole('button', { name: /Publish experience/i }));

  await waitFor(() => {
    const stored = JSON.parse(window.localStorage.getItem('worthit.reviews.v1'));
    expect(stored).toHaveLength(1);
    expect(stored[0]).toMatchObject({ productId: FIRST_PRODUCT_ID, rating: 4, isSynthetic: false, provenance: 'user_submitted_local' });
  });

  expect(await screen.findByText('from 1 community review')).toBeInTheDocument();
  const localReviewCard = screen.getByRole('heading', { name: 'A local first-party note' }).closest('article');
  expect(within(localReviewCard).getByText('Platform member')).toBeInTheDocument();
  expect(within(localReviewCard).getByRole('button', { name: /Helpful · 0/i })).toBeEnabled();
  expect(screen.getAllByText('Synthetic demo review')).toHaveLength(8);
});
