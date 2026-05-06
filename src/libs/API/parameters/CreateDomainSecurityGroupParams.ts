type CreateDomainSecurityGroupParams = {
    domainAccountID: number;
    name: string;
    value: string;
    shouldSetAsDefaultGroup: boolean;
};

export default CreateDomainSecurityGroupParams;
