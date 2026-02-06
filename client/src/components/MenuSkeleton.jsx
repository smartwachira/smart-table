import './Skeleton.css';

const MenuSkeleton  = ()=>{
    return(
        <div className="skeleton-card">
            <div className="skeleton skeleton-image"></div>
            <div className="skeleton-content">
                <div className="skeleton skeleton-title"></div>

                <div className="skeleton skeleton-text"></div>
                <div className="skeleton skeleton-text" style={{width:"90%"}}></div>

                <div style={{
                    marginTop: 'auto',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingTop: "15px"
                }}>
                    <div className="skeleton skeleton-text" style={{width: '40px', marginBottom: 0}}></div>
                    <div className="skeleton skeleton-text" style={{width: '80px', height:"35px", borderRadius: '20px', marginBottom: 0}}></div>
                </div>
            </div>
        </div>
    );
};

export default MenuSkeleton;