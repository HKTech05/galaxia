const { applyTokensOnEc2 } = require("./update_and_restart");

const hillviewToken = {
  IG_TOKEN_HILLVIEW: "IGAAXTprnk4M1BZAGJJYWc4ZAk1WcHNvUDAyMlhQMmgyc3ZAZALWwwcmRBQXlQdTBDMjYyT3FuQWgwbXlSdTA1RnZAhYTJYa1JjS09RcHp1ZAW1HNmNBaVB3TGpqcnJwSDRrbEdJUmVBN2Uxa0NjeWlxdDBlV1RydTFQWFZAUZAzVqdmx3VQZDZD"
};

applyTokensOnEc2(hillviewToken);
